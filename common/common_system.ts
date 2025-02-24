import type { AppCommand } from "$lib/command.ts";
import type { CommandHook } from "./hooks/command.ts";
import type { PlugNamespaceHook } from "$common/hooks/plug_namespace.ts";
import type { SilverBulletHooks } from "../lib/manifest.ts";
import { buildQueryFunctions } from "./query_functions.ts";
import { ScriptEnvironment } from "./space_script.ts";
import type { EventHook } from "./hooks/event.ts";
import type { DataStore } from "$lib/data/datastore.ts";
import type { System } from "$lib/plugos/system.ts";
import type { CodeWidgetHook } from "../web/hooks/code_widget.ts";
import type { PanelWidgetHook } from "../web/hooks/panel_widget.ts";
import type { SlashCommandHook } from "../web/hooks/slash_command.ts";
import type { DataStoreMQ } from "$lib/data/mq.datastore.ts";
import type { ParseTree } from "../plug-api/lib/tree.ts";
import { SpaceLuaEnvironment } from "$common/space_lua.ts";
import type { DocumentEditorHook } from "../web/hooks/document_editor.ts";

const mqTimeout = 10000; // 10s
const mqTimeoutRetry = 3;

export abstract class CommonSystem {
  system!: System<SilverBulletHooks>;

  // Hooks
  commandHook!: CommandHook;
  slashCommandHook?: SlashCommandHook;
  namespaceHook!: PlugNamespaceHook;
  codeWidgetHook!: CodeWidgetHook;
  panelWidgetHook!: PanelWidgetHook;
  documentEditorHook!: DocumentEditorHook;

  readonly allKnownFiles = new Set<string>();
  readonly spaceScriptCommands = new Map<string, AppCommand>();
  scriptEnv: ScriptEnvironment = new ScriptEnvironment();
  spaceLuaEnv = new SpaceLuaEnvironment();

  constructor(
    protected mq: DataStoreMQ,
    public ds: DataStore,
    public eventHook: EventHook,
    public readOnlyMode: boolean,
    protected enableSpaceScript: boolean,
  ) {
    setInterval(() => {
      mq.requeueTimeouts(mqTimeout, mqTimeoutRetry, true).catch(console.error);
    }, 20000); // Look to requeue every 20s
  }

  async loadSpaceScripts() {
    let functions = buildQueryFunctions(
      this.allKnownFiles,
      this.system,
    );
    if (this.enableSpaceScript) {
      this.scriptEnv = new ScriptEnvironment();
      try {
        await this.scriptEnv.loadFromSystem(this.system);
        console.log(
          "Loaded",
          Object.keys(this.scriptEnv.functions).length,
          "functions,",
          Object.keys(this.scriptEnv.commands).length,
          "commands,",
          Object.keys(this.scriptEnv.eventHandlers).length,
          "event handlers from space-script",
        );
        await this.spaceLuaEnv.reload(this.system);
      } catch (e: any) {
        console.error("Error loading space-script:", e.message);
      }
      functions = { ...functions, ...this.scriptEnv.functions };

      // Reset the space script commands
      this.spaceScriptCommands.clear();
      for (const [name, command] of Object.entries(this.scriptEnv.commands)) {
        this.spaceScriptCommands.set(name, command);
      }

      // Inject the registered events in the event hook
      this.eventHook.scriptEnvironment = this.scriptEnv;

      this.commandHook.throttledBuildAllCommands();
      if (this.slashCommandHook) {
        // Only on client
        this.slashCommandHook.throttledBuildAllCommands();
      }
    }

    // Swap in the expanded function map
    this.ds.functionMap = functions;
  }

  invokeSpaceFunction(name: string, args: any[]) {
    const fn = this.scriptEnv.functions[name];
    if (!fn) {
      throw new Error(`Function ${name} not found`);
    }
    return fn(...args);
  }

  async applyAttributeExtractors(
    tags: string[],
    text: string,
    tree: ParseTree,
  ): Promise<Record<string, any>> {
    let resultingAttributes: Record<string, any> = {};
    for (const tag of tags) {
      const extractors = this.scriptEnv.attributeExtractors[tag];
      if (!extractors) {
        continue;
      }
      for (const fn of extractors) {
        const extractorResult = await fn(text, tree);
        if (extractorResult) {
          // Merge the attributes in
          resultingAttributes = {
            ...resultingAttributes,
            ...extractorResult,
          };
        }
      }
    }

    return resultingAttributes;
  }
}
