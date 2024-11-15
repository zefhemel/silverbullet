import type { Manifest } from "../types.ts";
import type { ControllerMessage, WorkerMessage } from "../protocol.ts";
import type { Plug } from "../plug.ts";
import { AssetBundle, type AssetJson } from "../../asset_bundle/bundle.ts";
import type { Sandbox } from "./sandbox.ts";
import { toRealUrl } from "../../url_hack.ts";

/**
 * Represents a "safe" execution environment for plug code
 * Effectively this wraps a web worker, the reason to have this split from Plugs is to allow plugs to manage multiple sandboxes, e.g. for performance in the future
 */
export class WorkerSandbox<HookT> implements Sandbox<HookT> {
  private worker?: Worker;
  private reqId = 0;
  private outstandingInvocations = new Map<
    number,
    { resolve: (result: any) => void; reject: (e: any) => void }
  >();

  // public ready: Promise<void>;
  public manifest?: Manifest<HookT>;

  constructor(
    readonly plug: Plug<HookT>,
    public workerUrl: URL,
    private workerOptions = {},
  ) {
  }

  /**
   * Should only invoked lazily (either by invoke, or by a ManifestCache to load the manifest)
   */
  init(): Promise<void> {
    console.log("Booting up worker for", this.plug.name);
    if (this.worker) {
      // Race condition
      console.warn("Double init of sandbox, ignoring");
      return Promise.resolve();
    }
    this.worker = new Worker(toRealUrl(this.workerUrl), {
      ...this.workerOptions,
      type: "module",
    });

    return new Promise((resolve) => {
      this.worker!.onmessage = (ev) => {
        if (ev.data.type === "manifest") {
          this.manifest = ev.data.manifest;
          // Set manifest in the plug
          this.plug.manifest = this.manifest;

          // Set assets in the plug
          this.plug.assets = new AssetBundle(
            this.manifest?.assets ? this.manifest.assets as AssetJson : {},
          );

          return resolve();
        }

        this.onMessage(ev.data);
      };
    });
  }

  async onMessage(data: ControllerMessage) {
    if (!this.worker) {
      console.warn("Received message for terminated worker, ignoring");
      return;
    }
    switch (data.type) {
      case "sys":
        try {
          const result = await this.plug.syscall(data.name!, data.args!);

          this.worker && this.worker!.postMessage({
            type: "sysr",
            id: data.id,
            result: result,
          } as WorkerMessage);
        } catch (e: any) {
          // console.error("Syscall fail", e);
          this.worker && this.worker!.postMessage({
            type: "sysr",
            id: data.id,
            error: e.message,
          } as WorkerMessage);
        }
        break;
      case "invr": {
        const resultCbs = this.outstandingInvocations.get(data.id!);
        this.outstandingInvocations.delete(data.id!);
        if (data.error) {
          resultCbs &&
            resultCbs.reject(new Error(data.error));
        } else {
          resultCbs && resultCbs.resolve(data.result);
        }
        break;
      }
      default:
        console.error("Unknown message type", data);
    }
  }

  async invoke(name: string, args: any[]): Promise<any> {
    if (!this.worker) {
      // Lazy initialization
      await this.init();
    }
    this.reqId++;
    this.worker!.postMessage({
      type: "inv",
      id: this.reqId,
      name,
      args,
    } as WorkerMessage);
    return new Promise((resolve, reject) => {
      this.outstandingInvocations.set(this.reqId, { resolve, reject });
    });
  }

  stop() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = undefined;
    }
  }
}
