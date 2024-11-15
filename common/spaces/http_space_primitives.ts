import type { SpacePrimitives } from "./space_primitives.ts";
import type { FileMeta } from "../../plug-api/types.ts";
import {
  flushCachesAndUnregisterServiceWorker,
  unregisterServiceWorkers,
} from "../sw_util.ts";
import { encodePageURI } from "@silverbulletmd/silverbullet/lib/page_ref";
import { toRealUrl, urlPrefix } from "../../lib/url_hack.ts";

const defaultFetchTimeout = 30000; // 30 seconds

export class HttpSpacePrimitives implements SpacePrimitives {
  constructor(
    readonly url: string,
    readonly expectedSpacePath?: string,
    private bearerToken?: string,
  ) {
  }

  public async authenticatedFetch(
    url: string,
    options: RequestInit,
    fetchTimeout: number = defaultFetchTimeout,
  ): Promise<Response> {
    if (!options.headers) {
      options.headers = {};
    }
    options.headers = {
      ...options.headers,
      "X-Sync-Mode": "true",
    };
    if (this.bearerToken) {
      options.headers = {
        ...options.headers,
        "Authorization": `Bearer ${this.bearerToken}`,
      };
    }

    try {
      options.signal = AbortSignal.timeout(fetchTimeout);
      options.redirect = "manual";

      const result = await fetch(toRealUrl(url), options);
      if (result.status === 503) {
        throw new Error("Offline");
      }
      const redirectHeader = result.headers.get("location");

      if (result.type === "opaqueredirect" && !redirectHeader) {
        // This is a scenario where the server sent a redirect, but this redirect is not visible to the client, likely due to CORS
        // The best we can do is to reload the page and hope that the server will redirect us to the correct location
        alert(
          "You are not authenticated, reloading to reauthenticate",
        );
        console.log("Unregistering service workers", redirectHeader);
        await unregisterServiceWorkers();
        location.reload();
        // Let's throw to avoid any further processing
        throw Error("Not authenticated");
      }

      // console.log("Got response", result.status, result.statusText, result.url);

      // Attempting to handle various authentication proxies
      if (result.status >= 300 && result.status < 400) {
        if (redirectHeader) {
          // Got a redirect
          alert(
            "Received an authentication redirect, redirecting to URL: " +
              redirectHeader,
          );
          location.href = redirectHeader.startsWith(urlPrefix)
            ? redirectHeader
            : toRealUrl(redirectHeader);
          throw new Error("Redirected");
        } else {
          console.error("Got a redirect status but no location header", result);
        }
      }
      // Check for unauthorized status
      if (result.status === 401 || result.status === 403) {
        // If it came with a redirect header, we'll redirect to that URL
        if (redirectHeader) {
          console.log(
            "Received unauthorized status and got a redirect via the API so will redirect to URL",
            result.url,
          );
          alert("You are not authenticated, redirecting to: " + redirectHeader);
          location.href = redirectHeader.startsWith(urlPrefix)
            ? redirectHeader
            : toRealUrl(redirectHeader);
          throw new Error("Not authenticated");
        } else {
          // If not, let's reload
          alert(
            "You are not authenticated, going to reload and hope that that kicks off authentication",
          );
          location.reload();
          throw new Error("Not authenticated, got 401");
        }
      }
      return result;
    } catch (e: any) {
      // Errors when there is no internet connection:
      //
      // * Firefox: NetworkError when attempting to fetch resource (with SW and without)
      // * Safari (service worker enabled): FetchEvent.respondWith received an error: TypeError: Load failed
      // * Safari (no service worker): Load failed
      // * Chrome: Failed to fetch
      //
      // Common substrings: "fetch" "load failed"
      const errorMessage = e.message.toLowerCase();
      if (
        errorMessage.includes("fetch") || errorMessage.includes("load failed")
      ) {
        console.error(
          "Got error fetching, throwing offline",
          url,
          e,
        );
        throw new Error("Offline");
      }
      throw e;
    }
  }

  async fetchFileList(): Promise<FileMeta[]> {
    const resp = await this.authenticatedFetch(`${this.url}/index.json`, {
      method: "GET",
    });

    if (
      resp.status === 200 &&
      this.expectedSpacePath &&
      resp.headers.get("X-Space-Path") &&
      resp.headers.get("X-Space-Path") !== this.expectedSpacePath
    ) {
      console.log("Expected space path", this.expectedSpacePath);
      console.log("Got space path", resp.headers.get("X-Space-Path"));
      await flushCachesAndUnregisterServiceWorker();
      alert("Space folder path different on server, reloading the page");
      location.reload();
    }

    return resp.json();
  }

  async readFile(
    name: string,
  ): Promise<{ data: Uint8Array; meta: FileMeta }> {
    const res = await this.authenticatedFetch(
      `${this.url}/${encodePageURI(name)}`,
      {
        method: "GET",
        headers: {
          // This header won't trigger CORS preflight requests but can be interpreted on the server
          Accept: "application/octet-stream",
        },
      },
    );
    if (res.status === 404) {
      throw new Error(`Not found`);
    }
    return {
      data: new Uint8Array(await res.arrayBuffer()),
      meta: this.responseToMeta(name, res),
    };
  }

  async writeFile(
    name: string,
    data: Uint8Array,
    _selfUpdate?: boolean,
    meta?: FileMeta,
  ): Promise<FileMeta> {
    const headers: Record<string, string> = {
      "Content-Type": "application/octet-stream",
    };
    if (meta) {
      headers["X-Created"] = "" + meta.created;
      headers["X-Last-Modified"] = "" + meta.lastModified;
      headers["X-Perm"] = "" + meta.perm;
    }

    const res = await this.authenticatedFetch(
      `${this.url}/${encodePageURI(name)}`,
      {
        method: "PUT",
        headers,
        body: data,
      },
    );
    const newMeta = this.responseToMeta(name, res);
    return newMeta;
  }

  async deleteFile(name: string): Promise<void> {
    const req = await this.authenticatedFetch(
      `${this.url}/${encodePageURI(name)}`,
      {
        method: "DELETE",
      },
    );
    if (req.status !== 200) {
      throw Error(`Failed to delete file: ${req.statusText}`);
    }
  }

  async getFileMeta(name: string): Promise<FileMeta> {
    const res = await this.authenticatedFetch(
      `${this.url}/${encodePageURI(name)}`,
      // This used to use HEAD, but it seems that Safari on iOS is blocking cookies/credentials to be sent along with HEAD requests
      // so we'll use GET instead with a magic header which the server may or may not use to omit the body.
      {
        method: "GET",
        headers: {
          "X-Get-Meta": "true",
        },
      },
    );
    if (res.status === 404) {
      throw new Error(`Not found`);
    }
    if (!res.ok) {
      throw new Error(`Failed to get file meta: ${res.statusText}`);
    }
    return this.responseToMeta(name, res);
  }

  private responseToMeta(name: string, res: Response): FileMeta {
    return {
      name,
      // The server may set a custom X-Content-Length header in case a GET request was sent with X-Get-Meta, in which case the body may be omitted
      size: res.headers.has("X-Content-Length")
        ? +res.headers.get("X-Content-Length")!
        : +res.headers.get("Content-Length")!,
      contentType: res.headers.get("Content-type")!,
      created: +(res.headers.get("X-Created") || "0"),
      lastModified: +(res.headers.get("X-Last-Modified") || "0"),
      perm: (res.headers.get("X-Permission") as "rw" | "ro") || "ro",
    };
  }

  // Used to check if the server is reachable and the user is authenticated
  // If not: throws an error or invokes a redirect
  async ping() {
    await this.authenticatedFetch(`${this.url}/.ping`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }, 5000);
  }
}
