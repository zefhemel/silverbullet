import type { Hook, Manifest } from "$lib/plugos/types.ts";
import type { DocumentEditorT } from "$lib/manifest.ts";
import type { DocumentEditorCallback } from "@silverbulletmd/silverbullet/types";
import type { System } from "$lib/plugos/system.ts";

export class DocumentEditorHook implements Hook<DocumentEditorT> {
  documentEditors = new Map<
    string,
    { extensions: string[]; callback: DocumentEditorCallback }
  >();

  constructor() {}

  collectAllDocumentEditors(system: System<DocumentEditorT>) {
    this.documentEditors.clear();
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

        const conflict = Array.from(this.documentEditors.entries()).find((
          [_, { extensions }],
        ) => keys.some((key) => extensions.includes(key)));

        if (conflict) {
          console.log(
            `Extension definition of document editor ${name}: [${keys}] conflicts with the one from ${
              conflict[0]
            }: [${conflict[1].extensions}]! Using the latter.`,
          );
        }

        this.documentEditors.set(
          name,
          { extensions: keys, callback: () => plug.invoke(name, []) },
        );
      }
    }
  }

  apply(system: System<DocumentEditorT>): void {
    this.collectAllDocumentEditors(system);
    system.on({
      plugLoaded: () => {
        this.collectAllDocumentEditors(system);
      },
    });
  }

  validateManifest(manifest: Manifest<DocumentEditorT>): string[] {
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
          `Document editors require a string name or an array of string names.`,
        );
      }
    }
    return errors;
  }
}
