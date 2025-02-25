import { PlugNamespaceHook } from "$common/hooks/plug_namespace.ts";
import type { SilverBulletHooks } from "../lib/manifest.ts";
import { EventedSpacePrimitives } from "$common/spaces/evented_space_primitives.ts";
import { PlugSpacePrimitives } from "$common/spaces/plug_space_primitives.ts";
import { createSandbox } from "../lib/plugos/sandboxes/web_worker_sandbox.ts";
import { CronHook } from "../lib/plugos/hooks/cron.ts";
import type { EventHook } from "../common/hooks/event.ts";
import { MQHook } from "../lib/plugos/hooks/mq.ts";
import assetSyscalls from "../lib/plugos/syscalls/asset.ts";
import { eventSyscalls } from "../lib/plugos/syscalls/event.ts";
import { luaSyscalls } from "$common/syscalls/lua.ts";
import { mqSyscalls } from "../lib/plugos/syscalls/mq.ts";
import { System } from "../lib/plugos/system.ts";
import { Space } from "../common/space.ts";
import { markdownSyscalls } from "$common/syscalls/markdown.ts";
import { spaceReadSyscalls, spaceWriteSyscalls } from "./syscalls/space.ts";
import { systemSyscalls } from "$common/syscalls/system.ts";
import { jsonschemaSyscalls } from "$common/syscalls/jsonschema.ts";
import { yamlSyscalls } from "$common/syscalls/yaml.ts";
import { sandboxFetchSyscalls } from "../lib/plugos/syscalls/fetch.ts";
import { shellSyscalls } from "./syscalls/shell.ts";
import type { SpacePrimitives } from "$common/spaces/space_primitives.ts";
import type { Plug } from "../lib/plugos/plug.ts";
import { DataStore } from "$lib/data/datastore.ts";
import {
  dataStoreReadSyscalls,
  dataStoreWriteSyscalls,
} from "../lib/plugos/syscalls/datastore.ts";
import { languageSyscalls } from "$common/syscalls/language.ts";
import { templateSyscalls } from "$common/syscalls/template.ts";
import { codeWidgetSyscalls } from "../web/syscalls/code_widget.ts";
import { CodeWidgetHook } from "../web/hooks/code_widget.ts";
import { KVPrimitivesManifestCache } from "$lib/plugos/manifest_cache.ts";
import type { KvPrimitives } from "$lib/data/kv_primitives.ts";
import type { ShellBackend } from "./shell_backend.ts";
import { ensureSpaceIndex } from "$common/space_index.ts";
import type { FileMeta } from "../plug-api/types.ts";
import { CommandHook } from "$common/hooks/command.ts";
import { CommonSystem } from "$common/common_system.ts";
import { SyscallHook } from "../web/hooks/syscall.ts";
import type { DataStoreMQ } from "$lib/data/mq.datastore.ts";
import { plugPrefix } from "$common/spaces/constants.ts";
import { base64EncodedDataUrl } from "$lib/crypto.ts";
import type { ConfigContainer } from "../type/config.ts";
import { indexSyscalls } from "$common/syscalls/index.ts";
import { commandSyscalls } from "$common/syscalls/command.ts";
import { eventListenerSyscalls } from "$common/syscalls/event.ts";

const fileListInterval = 30 * 1000; // 30s

const plugNameExtractRegex = /([^/]+)\.plug\.js$/;

export class ServerSystem extends CommonSystem {
  listInterval?: number;

  constructor(
    public spacePrimitives: SpacePrimitives,
    private kvPrimitives: KvPrimitives,
    private shellBackend: ShellBackend,
    mq: DataStoreMQ,
    ds: DataStore,
    eventHook: EventHook,
    readOnlyMode: boolean,
    enableSpaceScript: boolean,
    private configContainer: ConfigContainer,
  ) {
    super(mq, ds, eventHook, readOnlyMode, enableSpaceScript);
  }

  // Always needs to be invoked right after construction
  async init(awaitIndex = false, performIndex = true) {
    this.system = new System(
      "server",
      {
        manifestCache: new KVPrimitivesManifestCache(
          this.kvPrimitives,
          "manifest",
        ),
        plugFlushTimeout: 5 * 60 * 1000, // 5 minutes
      },
    );

    this.ds = new DataStore(this.kvPrimitives);

    // Event hook
    this.system.addHook(this.eventHook);

    // Command hook, just for introspection
    this.commandHook = new CommandHook(
      this.readOnlyMode,
      this.spaceScriptCommands,
    );
    this.system.addHook(this.commandHook);

    // Cron hook
    const cronHook = new CronHook(this.system);
    this.system.addHook(cronHook);

    const plugNamespaceHook = new PlugNamespaceHook();
    this.system.addHook(plugNamespaceHook);

    this.system.addHook(new MQHook(this.system, this.mq));

    // Syscall hook
    this.system.addHook(new SyscallHook());

    const codeWidgetHook = new CodeWidgetHook();

    this.system.addHook(codeWidgetHook);

    const eventedSpacePrimitives = new EventedSpacePrimitives(
      new PlugSpacePrimitives(
        this.spacePrimitives,
        plugNamespaceHook,
      ),
      this.eventHook,
      {},
    );

    // Disable events until everything is set up
    eventedSpacePrimitives.enabled = false;

    this.spacePrimitives = eventedSpacePrimitives;

    const space = new Space(this.spacePrimitives, this.eventHook);

    // Add syscalls
    this.system.registerSyscalls(
      [],
      eventSyscalls(this.eventHook),
      eventListenerSyscalls(this),
      spaceReadSyscalls(space, this.allKnownFiles),
      assetSyscalls(this.system),
      yamlSyscalls(),
      systemSyscalls(
        this.system,
        this.readOnlyMode,
        this,
        this.configContainer,
      ),
      mqSyscalls(this.mq),
      languageSyscalls(),
      jsonschemaSyscalls(),
      indexSyscalls(this),
      commandSyscalls(this),
      luaSyscalls(this),
      templateSyscalls(this.ds),
      dataStoreReadSyscalls(this.ds, this),
      codeWidgetSyscalls(codeWidgetHook),
      markdownSyscalls(),
    );

    if (!this.readOnlyMode) {
      // Write mode only
      this.system.registerSyscalls(
        [],
        spaceWriteSyscalls(space),
        dataStoreWriteSyscalls(this.ds),
      );

      // Syscalls that require some additional permissions
      this.system.registerSyscalls(
        ["fetch"],
        sandboxFetchSyscalls(),
      );

      this.system.registerSyscalls(
        ["shell"],
        shellSyscalls(this.shellBackend),
      );
    }

    await this.loadPlugs();

    await this.loadSpaceScripts();

    this.listInterval = setInterval(() => {
      space.updatePageList().catch(console.error);
    }, fileListInterval);

    this.eventHook.addLocalListener(
      "file:changed",
      async (path, localChange) => {
        this.allKnownFiles.add(path);
        if (!localChange) {
          console.log("Outside file change: reindexing", path);
          // Change made outside of editor, trigger reindex
          if (path.endsWith(".md")) {
            const pageName = path.slice(0, -3);
            const data = await this.spacePrimitives.readFile(path);
            await this.eventHook.dispatchEvent("page:index_text", {
              name: pageName,
              text: new TextDecoder().decode(data.data),
            });
          }
        }

        if (path.startsWith(plugPrefix) && path.endsWith(".plug.js")) {
          console.log("Plug updated, reloading:", path);
          this.system.unload(path);
          await this.loadPlugFromSpace(path);
        }
      },
    );

    // Keep allKnownFiles up to date
    this.eventHook.addLocalListener(
      "file:listed",
      (allFiles: FileMeta[]) => {
        // Update list of known pages and documents
        this.allKnownFiles.clear();
        allFiles.forEach((f) => {
          if (!f.name.startsWith(plugPrefix)) {
            this.allKnownFiles.add(f.name);
          }
        });
      },
    );
    this.eventHook.addLocalListener(
      "file:deleted",
      (path: string) => {
        // Update list of known pages and documents
        this.allKnownFiles.delete(path);
      },
    );

    // All setup, enable eventing
    eventedSpacePrimitives.enabled = true;

    space.updatePageList().catch(console.error);

    if (performIndex) {
      // Ensure a valid index
      const indexPromise = ensureSpaceIndex(this.ds, this.system);
      if (awaitIndex) {
        await indexPromise;
      }
    }

    await this.eventHook.dispatchEvent("system:ready");
  }

  async loadPlugs() {
    for (const { name } of await this.spacePrimitives.fetchFileList()) {
      if (plugNameExtractRegex.test(name)) {
        await this.loadPlugFromSpace(name);
      }
    }
  }

  async loadPlugFromSpace(path: string): Promise<Plug<SilverBulletHooks>> {
    const { meta, data } = await this.spacePrimitives.readFile(path);
    const plugName = path.match(plugNameExtractRegex)![1];
    return this.system.load(
      plugName,
      createSandbox(
        // Base64 encoding this to support `deno compile` mode
        new URL(base64EncodedDataUrl("application/javascript", data)),
      ),
      meta.lastModified,
    );
  }

  async close() {
    clearInterval(this.listInterval);
    await this.system.unloadAll();
  }
}
