import type { DocumentMeta } from "@silverbulletmd/silverbullet/types";
import type { Client } from "./client.ts";
import { html as skeleton } from "./document_editor_skeleton.ts";
import { timeout } from "$lib/async.ts";

export class DocumentEditor {
  iframe!: HTMLIFrameElement;
  name!: string;
  extension!: string;
  currentPath: string | null = null;
  savePromise: PromiseWithResolvers<void> | null = null;

  constructor(
    readonly parent: HTMLElement,
    readonly client: Client,
    readonly saveMethod: (path: string, content: Uint8Array) => void,
  ) {}

  async init(client: Client, extension: string) {
    this.extension = extension;

    const entry = Array.from(
      client.clientSystem.documentEditorHook.documentEditors
        .entries(),
    ).find(([_, { extensions }]) => extensions.includes(this.extension));

    if (!entry) {
      throw new Error("Couldn't find plug for specified extension");
    }

    const [name, { callback }] = entry;
    this.name = name;

    const content = await callback();

    const [iframe, finished] = this.createIframe();
    this.iframe = iframe;

    this.parent.appendChild(this.iframe);

    await finished;

    this.sendMessage({
      type: "internal-init",
      html: content.html,
      script: content.script,
      theme: document.getElementsByTagName("html")[0].dataset.theme,
    });
  }

  async destroy() {
    // If name isn't initalized the editor is probably dead
    if (!this.name) return;

    await this.waitForSave();

    globalThis.removeEventListener("message", this.messageHandler);
    this.iframe.remove();
  }

  private async waitForSave() {
    if (this.savePromise) {
      try {
        await Promise.race([
          this.savePromise.promise,
          timeout(2500),
        ]);
      } catch {
        this.savePromise.resolve();
        this.savePromise = null;

        console.log(
          "Unable to save content of document editor in 2.5s. Aborting save",
        );
      }
    }
  }

  private sendMessage(message: { type: string } & any) {
    if (!this.iframe?.contentWindow) return;
    this.iframe.contentWindow.postMessage(message);
  }

  setContent(data: Uint8Array, meta: DocumentMeta) {
    this.sendMessage({
      type: "file-open",
      data,
      meta,
    });

    this.currentPath = meta.name;
  }

  async changeContent(data: Uint8Array, meta: DocumentMeta) {
    await this.waitForSave();

    this.sendMessage({
      type: "file-update",
      data,
      meta,
    });
  }

  requestSave() {
    if (this.savePromise) {
      console.log(
        "Save was already requested from editor, trying again anyways",
      );
    } else {
      this.savePromise = Promise.withResolvers();
    }

    this.sendMessage({
      type: "request-save",
    });
  }

  focus() {
    this.sendMessage({
      type: "focus",
    });
  }

  private async messageHandler(event: any) {
    if (event.source !== this.iframe.contentWindow) return;
    const data = event.data;
    if (!data) return;

    switch (data.type) {
      case "file-changed":
        {
          this.client.ui.viewDispatch({
            type: "document-editor-changed",
          });
          this.client.save().catch((e) => console.error("Couldn't save: ", e));
        }
        break;
      case "file-saved":
        {
          this.savePromise?.resolve();
          this.savePromise = null;

          if (!this.currentPath) return;
          this.saveMethod(this.currentPath, data.data);
        }
        break;
      case "internal-syscall":
        {
          let result: any;

          try {
            const response = await this.client.clientSystem.localSyscall(
              data.name,
              data.args,
            );

            result = { result: response };
          } catch (e: any) {
            result = { error: e.message };
          }

          this.sendMessage({
            type: "internal-syscall-response",
            id: data.id,
            ...result,
          });
        }
        break;
      default:
        console.warn("Unknown event sent from plug: ", data.type);
    }
  }

  private createIframe(): [HTMLIFrameElement, Promise<void>] {
    // Note: In the future we could maybe cache this iframe, for now it is not nearly necessary
    const iframe = document.createElement("iframe");

    iframe.src = "about:blank";
    iframe.style.visibility = "hidden";

    const ready = new Promise<void>((resolve) => {
      iframe.onload = () => {
        iframe.contentDocument!.write(skeleton);
        iframe.style.visibility = "visible";
        resolve();
      };
    });

    const finished = new Promise<void>((resolve) => {
      ready.then(() => {
        globalThis.addEventListener("message", this.messageHandler.bind(this));

        iframe.onload = null;

        if (!iframe.contentWindow) {
          console.warn("Iframe went away or content was not loaded");
          return;
        }

        resolve();
      });
    });

    return [iframe, finished];
  }
}
