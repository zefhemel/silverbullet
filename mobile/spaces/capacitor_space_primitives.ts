import {
  FileData,
  FileEncoding,
  SpacePrimitives,
} from "../../common/spaces/space_primitives.ts";
import type { FileMeta } from "../../common/types.ts";
import {
  base64Decode,
  base64Encode,
} from "../../plugos/asset_bundle/base64.ts";
import type { Plug } from "../../plugos/plug.ts";
import { Directory, Encoding, Filesystem } from "../deps.ts";
import { mime } from "../../plugos/deps.ts";

export class CapacitorSpacePrimitives implements SpacePrimitives {
  constructor(readonly source: Directory, readonly root: string) {
  }

  async fetchFileList(): Promise<FileMeta[]> {
    const files = await Filesystem.readdir({
      path: this.root,
      directory: this.source,
    });
    const allFiles: FileMeta[] = [];
    for (const file of files.files) {
      if (file.type === "file") {
        allFiles.push({
          name: file.name,
          lastModified: file.mtime,
          perm: "rw",
          contentType: mime.getType(file.name) || "application/octet-stream",
          size: file.size,
        });
      }
    }
    return allFiles;
  }
  async readFile(
    name: string,
    encoding: FileEncoding,
  ): Promise<{ data: FileData; meta: FileMeta }> {
    let data: FileData | undefined;
    switch (encoding) {
      case "string":
        data = (await Filesystem.readFile({
          path: this.root + name,
          directory: this.source,
          encoding: Encoding.UTF8,
        })).data;
        break;
      case "arraybuffer": {
        const b64Data = (await Filesystem.readFile({
          path: this.root + name,
          directory: this.source,
        })).data;
        data = base64Decode(b64Data);
        break;
      }
      case "dataurl": {
        const b64Data = (await Filesystem.readFile({
          path: this.root + name,
          directory: this.source,
        })).data;
        data = `data:${
          mime.getType(name) || "application/octet-stream"
        };base64,${b64Data}`;
        break;
      }
    }
    return {
      data,
      meta: await this.getFileMeta(name),
    };
  }
  async getFileMeta(name: string): Promise<FileMeta> {
    try {
      const statResult = await Filesystem.stat({
        path: this.root + name,
        directory: this.source,
      });
      return {
        name,
        contentType: mime.getType(name) || "application/octet-stream",
        lastModified: statResult.mtime,
        perm: "rw",
        size: statResult.size,
      };
    } catch (e: any) {
      console.error("Error getting file meta", e.message);
      throw new Error("File not found");
    }
  }
  async writeFile(
    name: string,
    encoding: FileEncoding,
    data: FileData,
  ): Promise<FileMeta> {
    switch (encoding) {
      case "string":
        await Filesystem.writeFile({
          path: this.root + name,
          directory: this.source,
          encoding: Encoding.UTF8,
          data: data as string,
        });
        break;
      case "arraybuffer":
        await Filesystem.writeFile({
          path: this.root + name,
          directory: this.source,
          data: base64Encode(new Uint8Array(data as ArrayBuffer)),
        });
        break;
      case "dataurl":
        await Filesystem.writeFile({
          path: this.root + name,
          directory: this.source,
          data: (data as string).split(";base64,")[1],
        });
        break;
    }
    return this.getFileMeta(name);
  }

  async deleteFile(name: string): Promise<void> {
    await Filesystem.deleteFile({
      path: this.root + name,
      directory: this.source,
    });
  }
  proxySyscall(plug: Plug<any>, name: string, args: any[]): Promise<any> {
    return plug.syscall(name, args);
  }
  invokeFunction(
    plug: Plug<any>,
    _env: string,
    name: string,
    args: any[],
  ): Promise<any> {
    return plug.invoke(name, args);
  }
}
