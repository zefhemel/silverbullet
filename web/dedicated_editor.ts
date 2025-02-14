import type { AttachmentMeta } from "@silverbulletmd/silverbullet/types";
import type { Client } from "./client.ts";
import { html as skeleton } from "./dedicated_editor_skeleton.ts";

export class DedicatedEditor {
  iframe!: HTMLIFrameElement;
  name!: string;
  currentPath: string | null = null;

  constructor(
    readonly parent: HTMLElement,
    readonly client: Client,
    readonly saveMethod: (path: string, content: Uint8Array) => void,
  ) {}

  async init(client: Client, extension: string) {
    const entry = Array.from(
      client.clientSystem.dedicatedEditorHook.dedicatedEditors
        .entries(),
    ).find(([_, { extensions }]) => extensions.includes(extension));

    if (!entry) {
      // TODO: Can we reallly throw here?
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
      type: "internal_init",
      html: content.html,
      script: content.script,
      // theme: document.getElementsByTagName("html")[0].dataset.theme,
    });
  }

  destroy() {
    // TODO: Send closing event & Think about how to handle last save
    globalThis.removeEventListener("message", this.messageHandler);
    this.iframe.remove();
  }

  private sendMessage(message: { type: string } & any) {
    this.iframe.contentWindow!.postMessage(message);
  }

  setContent(data: Uint8Array, meta: AttachmentMeta) {
    this.sendMessage({
      type: "file-open",
      data,
      meta,
    });

    this.currentPath = meta.name;
  }

  requestSave() {
    this.sendMessage({
      type: "request-save",
    });
  }

  private messageHandler(event: any) {
    if (event.source !== this.iframe.contentWindow) return;
    const data = event.data;
    if (!data) return;

    switch (data.type) {
      case "attachment-changed":
        {
          this.client.ui.viewDispatch({
            type: "dedicated-editor-changed",
          });
          this.client.save().catch((e) => console.error("Couldn't save: ", e));
        }
        break;
      case "attachment-saved":
        {
          if (!this.currentPath) return;
          this.saveMethod(this.currentPath, data.data);
        }
        break;
      default:
        console.log("Currently no events handled here");
    }
  }

  private createIframe(): [HTMLIFrameElement, Promise<void>] {
    // TODO: Cache this Iframe
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
