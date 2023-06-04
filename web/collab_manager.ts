import { nanoid } from "https://esm.sh/nanoid@4.0.0";
import type { Editor } from "./editor.tsx";

const collabPingInterval = 2500;

export class CollabManager {
  clientId = nanoid();
  localCollabServer: string;

  constructor(private editor: Editor) {
    this.localCollabServer = location.protocol === "http:"
      ? `ws://${location.host}/.ws-collab`
      : `wss://${location.host}/.ws-collab`;
    editor.eventHook.addLocalListener(
      "editor:pageLoaded",
      (pageName, previousPage) => {
        console.log("Page loaded", pageName, previousPage);
        this.ping(pageName, previousPage).catch(console.error);
      },
    );
  }

  start() {
    setInterval(() => {
      this.ping(this.editor.currentPage!).catch(console.error);
    }, collabPingInterval);
  }

  async ping(currentPage?: string, previousPage?: string) {
    try {
      const resp = await this.editor.remoteSpacePrimitives.authenticatedFetch(
        this.editor.remoteSpacePrimitives.url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            operation: "ping",
            clientId: this.clientId,
            previousPage,
            currentPage,
          }),
          keepalive: true, // important for beforeunload event
        },
      );
      const { collabId } = await resp.json();
      console.log("Collab ID", collabId);
      const previousCollabId = this.editor.collabState?.token.split("/")[0];
      if (!collabId && this.editor.collabState) {
        // Stop collab
        console.log("Stopping collab");
        if (this.editor.collabState.pageName === currentPage) {
          this.editor.flashNotification(
            "Other users have left this page, switched back to single-user mode.",
          );
        }
        this.editor.stopCollab();
      } else if (collabId && collabId !== previousCollabId) {
        // Start collab
        console.log("Starting collab");
        this.editor.flashNotification(
          "Opening page in multi-user mode.",
        );
        this.editor.startCollab(
          this.localCollabServer,
          `${collabId}/${currentPage}`,
          "you",
        );
      }
    } catch (e: any) {
      // console.error("Ping error", e);
      if (e.message.includes("Failed to fetch") && this.editor.collabState) {
        console.log("Offline, stopping collab");
        this.editor.stopCollab();
      }
    }
  }
}
