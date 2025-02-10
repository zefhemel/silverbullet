import type { Hook, Manifest } from "$lib/plugos/types.ts";
import type { DedicatedEditorT } from "$lib/manifest.ts";
import type { DedicatedEditorCallback } from "@silverbulletmd/silverbullet/types";
import type { System } from "$lib/plugos/system.ts";

export class DedicatedEditorHook implements Hook<DedicatedEditorT> {
  editorCallbacks = new Map<string, DedicatedEditorCallback>();

  constructor() {}

  collectAllDedicatedEditors(system: System<DedicatedEditorT>) {
    this.editorCallbacks.clear();
    for (const plug of system.loadedPlugs.values()) {
      for (
        const [name, functionDef] of Object.entries(
          plug.manifest!.functions,
        )
      ) {
        if (!functionDef.editor) {
          continue;
        }

        const keys = Array.isArray(functionDef.editor)
          ? functionDef.editor
          : [functionDef.editor];

        for (const key of keys) {
          this.editorCallbacks.set(
            key,
            () => plug.invoke(name, []),
          );
        }
      }
    }
  }

  apply(system: System<DedicatedEditorT>): void {
    this.collectAllDedicatedEditors(system);
    system.on({
      plugLoaded: () => {
        this.collectAllDedicatedEditors(system);
      },
    });
  }

  validateManifest(manifest: Manifest<DedicatedEditorT>): string[] {
    const errors = [];
    for (const functionDef of Object.values(manifest.functions)) {
      if (!functionDef.editor) {
        continue;
      }
      if (
        typeof functionDef.editor !== "string" &&
        !Array.isArray(functionDef.editor)
      ) {
        errors.push(
          `Dedicated editors require a string name or an array of string names.`,
        );
      }
    }
    return errors;
  }
}
