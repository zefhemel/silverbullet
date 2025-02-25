import type { FileMeta } from "@silverbulletmd/silverbullet/types";
import type { EventHook } from "$common/hooks/event.ts";
import { plugPrefix } from "$common/spaces/constants.ts";

import type { SpacePrimitives } from "./space_primitives.ts";

/**
 * Events exposed:
 * - file:changed (string, localUpdate: boolean)
 * - file:deleted (string)
 * - file:listed (FileMeta[])
 * - page:saved (string, FileMeta)
 * - page:deleted (string)
 */
export class EventedSpacePrimitives implements SpacePrimitives {
  // Various operations may be going on at the same time, and we don't want to trigger events unnessarily.
  // Therefore we use this variable to track if any operation is in flight, and if so, we skip event triggering.
  // This is ok, because any event will be picked up in a following iteration.
  operationInProgress = false;

  initialFileListLoad: boolean;

  public enabled = true;

  constructor(
    private wrapped: SpacePrimitives,
    private eventHook: EventHook,
    private spaceSnapshot: Record<string, number> = {},
  ) {
    // Translate file change events for documents into document:index events
    this.eventHook.addLocalListener(
      "file:changed",
      async (
        name: string,
      ) => {
        if (!name.endsWith(".md") && !name.startsWith(plugPrefix)) {
          // Not a page nor plug, so a document!
          await this.dispatchEvent("document:index", name);
        }
      },
    );
    this.initialFileListLoad = Object.keys(this.spaceSnapshot).length === 0;
  }

  dispatchEvent(name: string, ...args: any[]): Promise<any[]> {
    return this.eventHook.dispatchEvent(name, ...args);
  }

  async fetchFileList(): Promise<FileMeta[]> {
    if (!this.enabled) {
      return this.wrapped.fetchFileList();
    }
    if (this.operationInProgress) {
      // Some other operation (read, write, list, meta) is already going on
      // this will likely trigger events, so let's not worry about any of that and avoid race condition and inconsistent data.
      console.info(
        "alreadyFetching is on, skipping even triggering for fetchFileList.",
      );
      return this.wrapped.fetchFileList();
    }
    // console.log("Fetching file list");
    // Fetching mutex
    this.operationInProgress = true;
    try {
      // Fetch the list
      const newFileList = await this.wrapped.fetchFileList();

      // Now we have the list, let's compare it to the snapshot and trigger events appropriately
      const deletedFiles = new Set<string>(Object.keys(this.spaceSnapshot));
      for (const meta of newFileList) {
        const oldHash = this.spaceSnapshot[meta.name];
        const newHash = meta.lastModified;
        // Update in snapshot
        this.spaceSnapshot[meta.name] = newHash;

        // Check what happened to the file
        if (
          (
            // New file scenario
            !oldHash && !this.initialFileListLoad
          ) || (
            // Changed file scenario
            oldHash &&
            oldHash !== newHash
          )
        ) {
          console.log("Detected file change", meta.name, oldHash, newHash);
          await this.dispatchEvent(
            "file:changed",
            meta.name,
            false,
            oldHash,
            newHash,
          );
        }
        // Page found, not deleted
        deletedFiles.delete(meta.name);
      }

      for (const deletedFile of deletedFiles) {
        delete this.spaceSnapshot[deletedFile];
        await this.dispatchEvent("file:deleted", deletedFile);

        if (deletedFile.endsWith(".md")) {
          const pageName = deletedFile.substring(0, deletedFile.length - 3);
          await this.dispatchEvent("page:deleted", pageName);
        }
      }

      await this.dispatchEvent("file:listed", newFileList);
      this.initialFileListLoad = false;
      return newFileList;
    } finally {
      this.operationInProgress = false;
    }
  }

  async readFile(
    name: string,
  ): Promise<{ data: Uint8Array; meta: FileMeta }> {
    if (!this.enabled) {
      return this.wrapped.readFile(name);
    }
    try {
      // Fetching mutex
      const wasFetching = this.operationInProgress;
      this.operationInProgress = true;

      // Fetch file
      const data = await this.wrapped.readFile(name);
      if (!wasFetching) {
        this.triggerEventsAndCache(name, data.meta.lastModified);
      }
      return data;
    } finally {
      this.operationInProgress = false;
    }
  }

  async writeFile(
    name: string,
    data: Uint8Array,
    // TODO: Is self update still used or can it now be removed?
    selfUpdate?: boolean,
    meta?: FileMeta,
  ): Promise<FileMeta> {
    if (!this.enabled) {
      return this.wrapped.writeFile(name, data, selfUpdate, meta);
    }
    try {
      this.operationInProgress = true;
      const newMeta = await this.wrapped.writeFile(
        name,
        data,
        selfUpdate,
        meta,
      );
      await this.dispatchEvent(
        "file:changed",
        name,
        true,
        undefined,
        newMeta.lastModified,
      );
      this.spaceSnapshot[name] = newMeta.lastModified;

      if (name.endsWith(".md")) {
        // Let's trigger some page-specific events
        const pageName = name.substring(0, name.length - 3);
        let text = "";
        const decoder = new TextDecoder("utf-8");
        text = decoder.decode(data);

        await this.dispatchEvent("page:saved", pageName, newMeta);
        await this.dispatchEvent("page:index_text", {
          name: pageName,
          text,
        });
      }
      return newMeta;
    } finally {
      this.operationInProgress = false;
    }
  }

  triggerEventsAndCache(name: string, newHash: number) {
    const oldHash = this.spaceSnapshot[name];
    if (oldHash && newHash && oldHash !== newHash) {
      // Page changed since last cached metadata, trigger event
      this.dispatchEvent("file:changed", name, false, oldHash, newHash);
    }
    this.spaceSnapshot[name] = newHash;
    return;
  }

  async getFileMeta(name: string): Promise<FileMeta> {
    if (!this.enabled) {
      return this.wrapped.getFileMeta(name);
    }
    try {
      const wasFetching = this.operationInProgress;
      this.operationInProgress = true;
      const newMeta = await this.wrapped.getFileMeta(name);
      if (!wasFetching) {
        this.triggerEventsAndCache(name, newMeta.lastModified);
      }
      return newMeta;
    } catch (e: any) {
      // console.log("Checking error", e, name);
      if (e.message === "Not found") {
        await this.dispatchEvent("file:deleted", name);
        if (name.endsWith(".md")) {
          const pageName = name.substring(0, name.length - 3);
          await this.dispatchEvent("page:deleted", pageName);
        }
      }
      throw e;
    } finally {
      this.operationInProgress = false;
    }
  }

  async deleteFile(name: string): Promise<void> {
    if (!this.enabled) {
      return this.wrapped.deleteFile(name);
    }
    try {
      this.operationInProgress = true;
      if (name.endsWith(".md")) {
        const pageName = name.substring(0, name.length - 3);
        await this.dispatchEvent("page:deleted", pageName);
      }
      // await this.getPageMeta(name); // Check if page exists, if not throws Error
      await this.wrapped.deleteFile(name);
      delete this.spaceSnapshot[name];
      await this.dispatchEvent("file:deleted", name);
    } finally {
      this.operationInProgress = false;
    }
  }
}
