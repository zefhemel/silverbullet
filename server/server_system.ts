import { PlugNamespaceHook } from "$common/hooks/plug_namespace.ts";
import { SilverBulletHooks } from "$common/manifest.ts";
import { EventedSpacePrimitives } from "$common/spaces/evented_space_primitives.ts";
import { PlugSpacePrimitives } from "$common/spaces/plug_space_primitives.ts";
import { createSandbox } from "../plugos/sandboxes/web_worker_sandbox.ts";
import { CronHook } from "../plugos/hooks/cron.ts";
import { EventHook } from "../plugos/hooks/event.ts";
import { MQHook } from "../plugos/hooks/mq.ts";
import assetSyscalls from "../plugos/syscalls/asset.ts";
import { eventSyscalls } from "../plugos/syscalls/event.ts";
import { mqSyscalls } from "../plugos/syscalls/mq.ts";
import { System } from "../plugos/system.ts";
import { Space } from "../web/space.ts";
import { markdownSyscalls } from "$common/syscalls/markdown.ts";
import { spaceReadSyscalls, spaceWriteSyscalls } from "./syscalls/space.ts";
import { systemSyscalls } from "$common/syscalls/system.ts";
import { yamlSyscalls } from "$common/syscalls/yaml.ts";
import { sandboxFetchSyscalls } from "../plugos/syscalls/fetch.ts";
import { shellSyscalls } from "./syscalls/shell.ts";
import { SpacePrimitives } from "$common/spaces/space_primitives.ts";
import { Plug } from "../plugos/plug.ts";
import { DataStore } from "../plugos/lib/datastore.ts";
import {
  dataStoreReadSyscalls,
  dataStoreWriteSyscalls,
} from "../plugos/syscalls/datastore.ts";
import { languageSyscalls } from "$common/syscalls/language.ts";
import { templateSyscalls } from "$common/syscalls/template.ts";
import { codeWidgetSyscalls } from "../web/syscalls/code_widget.ts";
import { CodeWidgetHook } from "../web/hooks/code_widget.ts";
import { KVPrimitivesManifestCache } from "../plugos/manifest_cache.ts";
import { KvPrimitives } from "../plugos/lib/kv_primitives.ts";
import { ShellBackend } from "./shell_backend.ts";
import { ensureSpaceIndex } from "$common/space_index.ts";
import { FileMeta } from "../type/types.ts";
import { CommandHook } from "$common/hooks/command.ts";
import { CommonSystem } from "$common/common_system.ts";
import { DataStoreMQ } from "../plugos/lib/mq.datastore.ts";
import { plugPrefix } from "$common/spaces/constants.ts";
import { base64EncodedDataUrl } from "../lib/crypto.ts";

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
  ) {
    super(mq, ds, eventHook, readOnlyMode, enableSpaceScript);
  }

  // Always needs to be invoked right after construction
  async init(awaitIndex = false) {
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
    const eventHook = new EventHook();
    this.system.addHook(eventHook);

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

    const codeWidgetHook = new CodeWidgetHook();

    this.system.addHook(codeWidgetHook);

    this.spacePrimitives = new EventedSpacePrimitives(
      new PlugSpacePrimitives(
        this.spacePrimitives,
        plugNamespaceHook,
      ),
      eventHook,
    );
    const space = new Space(this.spacePrimitives, eventHook);

    // Add syscalls
    this.system.registerSyscalls(
      [],
      eventSyscalls(eventHook),
      spaceReadSyscalls(space),
      assetSyscalls(this.system),
      yamlSyscalls(),
      systemSyscalls(this.system, this.readOnlyMode, this),
      mqSyscalls(this.mq),
      languageSyscalls(),
      templateSyscalls(this.ds),
      dataStoreReadSyscalls(this.ds),
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

    eventHook.addLocalListener("file:changed", async (path, localChange) => {
      if (!localChange && path.endsWith(".md")) {
        const pageName = path.slice(0, -3);
        const data = await this.spacePrimitives.readFile(path);
        console.log("Outside page change: reindexing", pageName);
        // Change made outside of editor, trigger reindex
        await eventHook.dispatchEvent("page:index_text", {
          name: pageName,
          text: new TextDecoder().decode(data.data),
        });
      }

      if (path.startsWith(plugPrefix) && path.endsWith(".plug.js")) {
        console.log("Plug updated, reloading:", path);
        this.system.unload(path);
        await this.loadPlugFromSpace(path);
      }
    });

    eventHook.addLocalListener(
      "file:listed",
      (allFiles: FileMeta[]) => {
        // Update list of known pages
        this.allKnownPages.clear();
        allFiles.forEach((f) => {
          if (f.name.endsWith(".md")) {
            this.allKnownPages.add(f.name.slice(0, -3));
          }
        });
      },
    );

    // Ensure a valid index
    const indexPromise = ensureSpaceIndex(this.ds, this.system);
    if (awaitIndex) {
      await indexPromise;
    }

    await eventHook.dispatchEvent("system:ready");
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
