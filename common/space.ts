import type { SpacePrimitives } from "$common/spaces/space_primitives.ts";
import { plugPrefix } from "$common/spaces/constants.ts";

import type { AttachmentMeta, FileMeta, PageMeta } from "../plug-api/types.ts";
import type { EventHook } from "./hooks/event.ts";
import { safeRun } from "../lib/async.ts";
import { localDateString } from "$lib/dates.ts";

const pageWatchInterval = 5000;

export class Space {
  // We do watch files in the background to detect changes
  // This set of pages should only ever contain 1 page
  watchedFiles = new Set<string>();
  watchInterval?: number;

  // private initialPageListLoad = true;
  private saving = false;

  constructor(
    readonly spacePrimitives: SpacePrimitives,
    eventHook: EventHook,
  ) {
    eventHook.addLocalListener("page:deleted", (pageName: string) => {
      const fileName = `${pageName}.md`;

      if (this.watchedFiles.has(fileName)) {
        // Stop watching deleted pages already
        this.watchedFiles.delete(fileName);
      }
    });
    setTimeout(() => {
      // Next tick, to ensure that the space is initialized
      this.updatePageList().catch(console.error);
    });
  }

  public async updatePageList() {
    // The only reason to do this is to trigger events
    await this.fetchPageList();
  }

  async deletePage(name: string): Promise<void> {
    await this.getPageMeta(name); // Check if page exists, if not throws Error
    await this.spacePrimitives.deleteFile(`${name}.md`);
  }

  async getPageMeta(name: string): Promise<PageMeta> {
    return fileMetaToPageMeta(
      await this.spacePrimitives.getFileMeta(`${name}.md`),
    );
  }

  async listPlugs(): Promise<FileMeta[]> {
    const files = await this.deduplicatedFileList();
    return files
      .filter((fileMeta) =>
        fileMeta.name.startsWith(plugPrefix) &&
        fileMeta.name.endsWith(".plug.js")
      );
  }

  async readPage(name: string): Promise<{ text: string; meta: PageMeta }> {
    const pageData = await this.spacePrimitives.readFile(`${name}.md`);
    return {
      text: new TextDecoder().decode(pageData.data),
      meta: fileMetaToPageMeta(pageData.meta),
    };
  }

  async writePage(
    name: string,
    text: string,
    selfUpdate?: boolean,
  ): Promise<PageMeta> {
    try {
      this.saving = true;
      const pageMeta = fileMetaToPageMeta(
        await this.spacePrimitives.writeFile(
          `${name}.md`,
          new TextEncoder().encode(text),
          selfUpdate,
        ),
      );
      // Note: we don't do very elaborate cache invalidation work here, quite quickly the cache will be flushed anyway
      return pageMeta;
    } finally {
      this.saving = false;
    }
  }

  // We're listing all pages that don't start with a _
  isListedPage(fileMeta: FileMeta): boolean {
    return fileMeta.name.endsWith(".md") && !fileMeta.name.startsWith("_");
  }

  async fetchPageList(): Promise<PageMeta[]> {
    return (await this.deduplicatedFileList())
      .filter(this.isListedPage)
      .map(fileMetaToPageMeta);
  }

  async fetchAttachmentList(): Promise<AttachmentMeta[]> {
    return (await this.deduplicatedFileList()).flatMap((fileMeta) =>
      !this.isListedPage(fileMeta) &&
        !fileMeta.name.endsWith(".plug.js")
        ? [fileMetaToAttachmentMeta(fileMeta)]
        : []
    );
  }

  async deduplicatedFileList(): Promise<FileMeta[]> {
    const files = await this.spacePrimitives.fetchFileList();
    const fileMap = new Map<string, FileMeta>();
    for (const file of files) {
      if (fileMap.has(file.name)) {
        const existing = fileMap.get(file.name)!;
        if (existing.lastModified < file.lastModified) {
          fileMap.set(file.name, file);
        }
      } else {
        fileMap.set(file.name, file);
      }
    }
    return [...fileMap.values()];
  }

  /**
   * Reads an attachment
   * @param name path of the attachment
   * @returns
   */
  async readAttachment(
    name: string,
  ): Promise<{ data: Uint8Array; meta: AttachmentMeta }> {
    const file = await this.spacePrimitives.readFile(name);
    return { data: file.data, meta: fileMetaToAttachmentMeta(file.meta) };
  }

  async getAttachmentMeta(name: string): Promise<AttachmentMeta> {
    return fileMetaToAttachmentMeta(
      await this.spacePrimitives.getFileMeta(name),
    );
  }

  async writeAttachment(
    name: string,
    data: Uint8Array,
    selfUpdate?: boolean,
  ): Promise<AttachmentMeta> {
    return fileMetaToAttachmentMeta(
      await this.spacePrimitives.writeFile(name, data, selfUpdate),
    );
  }

  deleteAttachment(name: string): Promise<void> {
    return this.spacePrimitives.deleteFile(name);
  }

  // Even though changes coming from a sync cycle will immediately trigger a reload
  // there are scenarios in which other tabs run the sync, so we have to poll for changes
  watch() {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
    }
    this.watchInterval = setInterval(() => {
      safeRun(async () => {
        if (this.saving) {
          return;
        }
        for (const fileName of this.watchedFiles) {
          await this.spacePrimitives.getFileMeta(fileName);
        }
      });
    }, pageWatchInterval);
  }

  unwatch() {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
    }
  }

  watchPage(pageName: string) {
    this.watchedFiles.add(`${pageName}.md`);
  }

  unwatchPage(pageName: string) {
    this.watchedFiles.delete(`${pageName}.md`);
  }

  watchFile(fileName: string) {
    this.watchedFiles.add(fileName);
  }

  unwatchFile(fileName: string) {
    this.watchedFiles.delete(fileName);
  }
}

export function fileMetaToPageMeta(fileMeta: FileMeta): PageMeta {
  const name = fileMeta.name.substring(0, fileMeta.name.length - 3);
  try {
    return {
      ...fileMeta,
      ref: name,
      tag: "page",
      name,
      created: localDateString(new Date(fileMeta.created)),
      lastModified: localDateString(new Date(fileMeta.lastModified)),
    } as PageMeta;
  } catch (e) {
    console.error("Failed to convert fileMeta to pageMeta", fileMeta, e);
    throw e;
  }
}

export function fileMetaToAttachmentMeta(
  fileMeta: FileMeta,
): AttachmentMeta {
  try {
    return {
      ...fileMeta,
      ref: fileMeta.name,
      tag: "attachment",
      created: localDateString(new Date(fileMeta.created)),
      lastModified: localDateString(new Date(fileMeta.lastModified)),
      extension: fileMeta.name.split(".").pop()?.toLowerCase(),
    } as AttachmentMeta;
  } catch (e) {
    console.error("Failed to convert fileMeta to attachmentMeta", fileMeta, e);
    throw e;
  }
}
