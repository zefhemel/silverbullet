import { resolve } from "@std/path";
import assets from "../dist/plug_asset_bundle.json" with { type: "json" };
import { determineDatabaseBackend } from "../server/db_backend.ts";
import type { KvPrimitives } from "$lib/data/kv_primitives.ts";
import { DiskSpacePrimitives } from "$common/spaces/disk_space_primitives.ts";

import { ServerSystem } from "../server/server_system.ts";
import { AssetBundlePlugSpacePrimitives } from "$common/spaces/asset_bundle_space_primitives.ts";
import { LocalShell } from "../server/shell_backend.ts";
import { Hono } from "@hono/hono";
import { DataStore } from "$lib/data/datastore.ts";
import { DataStoreMQ } from "$lib/data/mq.datastore.ts";
import { EventHook } from "../common/hooks/event.ts";
import { sleep } from "$lib/async.ts";
import { AssetBundle } from "$lib/asset_bundle/bundle.ts";
import {
  type ConfigContainer,
  defaultConfig,
} from "@silverbulletmd/silverbullet/type/config";

export async function plugRunCommand(
  {
    hostname,
    port,
  }: {
    hostname?: string;
    port?: number;
  },
  spacePath: string,
  functionName: string | undefined,
  ...args: string[]
) {
  spacePath = resolve(spacePath);
  console.log("Space path", spacePath);
  console.log("Function to run:", functionName, "with arguments", args);

  const kvPrimitives = await determineDatabaseBackend(spacePath);

  if (!kvPrimitives) {
    console.error("Cannot run plugs in databaseless mode.");
    return;
  }

  try {
    const result = await runPlug(
      spacePath,
      functionName,
      args,
      new AssetBundle(assets),
      kvPrimitives,
      port,
      hostname,
    );
    if (result) {
      console.log("Output", result);
    }
    kvPrimitives.close();
    Deno.exit(0);
  } catch (e: any) {
    console.error(e.message);
    Deno.exit(1);
  }
}

export async function runPlug(
  spacePath: string,
  functionName: string | undefined,
  args: any[] = [],
  builtinAssetBundle: AssetBundle,
  kvPrimitives: KvPrimitives,
  httpServerPort?: number,
  httpHostname?: string,
) {
  const serverController = new AbortController();
  const app = new Hono();

  const ds = new DataStore(kvPrimitives);
  const mq = new DataStoreMQ(ds);
  const eventHook = new EventHook();
  // TODO: Actually load config from the space
  const configContainer: ConfigContainer = {
    config: defaultConfig,
    loadConfig: () => Promise.resolve(),
  };

  const serverSystem = new ServerSystem(
    new AssetBundlePlugSpacePrimitives(
      new DiskSpacePrimitives(spacePath),
      builtinAssetBundle,
    ),
    kvPrimitives,
    new LocalShell(spacePath),
    mq,
    ds,
    eventHook,
    false,
    true,
    configContainer,
  );
  await serverSystem.init(true);
  if (httpHostname && httpServerPort) {
    Deno.serve({
      hostname: httpHostname,
      port: httpServerPort,
      signal: serverController.signal,
    }, app.fetch);
  }

  if (functionName) {
    const result = await serverSystem.system.invokeFunction(functionName, args);
    await serverSystem.close();
    serverController.abort();
    return result;
  } else {
    console.log("Running in server mode, use Ctrl-c to stop");
    while (true) {
      await sleep(1000);
    }
  }
}
