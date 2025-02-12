import type { AttachmentMeta } from "@silverbulletmd/silverbullet/types";
import type { Client } from "./client.ts";
import { html as skeleton } from "./dedicated_editor_skeleton.ts";

export class DedicatedEditor {
  iframe!: HTMLIFrameElement;
  // TODO: Handle focusing somehow
  hasFocus: boolean = true;

  constructor(readonly parent: HTMLElement) {}

  async init(client: Client, extension: string) {
    const callback = Array.from(
      client.clientSystem.dedicatedEditorHook.dedicatedEditors
        .values(),
    ).find(({ extensions }) => extensions.includes(extension))
      ?.callback;
    if (!callback) {
      throw new Error("Couldn't find plug for specified extension");
    }

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
    // globalThis.document.removeEventListener(
    //   "iframe_keydown",
    //   this.iframeKeydownHandler,
    // );
    this.iframe.remove();
  }

  private sendMessage(message: { type: string } & any) {
    this.iframe.contentWindow!.postMessage(message);
  }

  setContent(data: Uint8Array, meta: AttachmentMeta) {
    this.sendMessage({
      type: "file_open",
      data,
      meta,
    });
  }

  private messageHandler(event: any) {
    if (event.source !== this.iframe.contentWindow) return;
    const data = event.data;
    if (!data) return;

    switch (data.type) {
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
