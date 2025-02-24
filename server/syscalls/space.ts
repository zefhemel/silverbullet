import type { DocumentMeta, FileMeta, PageMeta } from "../../plug-api/types.ts";
import type { SysCallMapping } from "../../lib/plugos/system.ts";
import type { Space } from "../../common/space.ts";

/**
 * Almost the same as web/syscalls/space.ts except leaving out client-specific stuff
 */
export function spaceReadSyscalls(
  space: Space,
  allKnownFiles: Set<string>,
): SysCallMapping {
  return {
    "space.listPages": (): Promise<PageMeta[]> => {
      return space.fetchPageList();
    },
    "space.readPage": async (_ctx, name: string): Promise<string> => {
      return (await space.readPage(name)).text;
    },
    "space.getPageMeta": (_ctx, name: string): Promise<PageMeta> => {
      return space.getPageMeta(name);
    },
    "space.listPlugs": (): Promise<FileMeta[]> => {
      return space.listPlugs();
    },
    "space.listDocuments": async (): Promise<DocumentMeta[]> => {
      return await space.fetchDocumentList();
    },
    "space.readDocument": async (_ctx, name: string): Promise<Uint8Array> => {
      return (await space.readDocument(name)).data;
    },
    "space.getDocumentMeta": async (
      _ctx,
      name: string,
    ): Promise<DocumentMeta> => {
      return await space.getDocumentMeta(name);
    },

    // FS
    "space.listFiles": (): Promise<FileMeta[]> => {
      return space.spacePrimitives.fetchFileList();
    },
    "space.getFileMeta": (_ctx, name: string): Promise<FileMeta> => {
      return space.spacePrimitives.getFileMeta(name);
    },
    "space.readFile": async (_ctx, name: string): Promise<Uint8Array> => {
      return (await space.spacePrimitives.readFile(name)).data;
    },
    "space.fileExists": (_ctx, name: string): boolean => {
      return allKnownFiles.has(name);
    },
  };
}

export function spaceWriteSyscalls(space: Space): SysCallMapping {
  return {
    "space.writePage": (
      _ctx,
      name: string,
      text: string,
    ): Promise<PageMeta> => {
      return space.writePage(name, text);
    },
    "space.deletePage": async (_ctx, name: string) => {
      await space.deletePage(name);
    },
    "space.writeDocument": (
      _ctx,
      name: string,
      data: Uint8Array,
    ): Promise<DocumentMeta> => {
      return space.writeDocument(name, data);
    },
    "space.deleteDocument": async (_ctx, name: string) => {
      await space.deleteDocument(name);
    },
    "space.writeFile": (
      _ctx,
      name: string,
      data: Uint8Array,
    ): Promise<FileMeta> => {
      return space.spacePrimitives.writeFile(name, data);
    },
    "space.deleteFile": (_ctx, name: string) => {
      return space.spacePrimitives.deleteFile(name);
    },
  };
}
