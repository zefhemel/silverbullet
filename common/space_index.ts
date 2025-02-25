import type { DataStore } from "$lib/data/datastore.ts";
import type { System } from "$lib/plugos/system.ts";

const indexVersionKey = ["$indexVersion"];

// Bump this one every time a full reindex is needed
const desiredIndexVersion = 7;

let indexOngoing = false;

export async function ensureSpaceIndex(ds: DataStore, system: System<any>) {
  const currentIndexVersion = await ds.get(indexVersionKey);

  console.info("Current space index version", currentIndexVersion);

  if (currentIndexVersion !== desiredIndexVersion && !indexOngoing) {
    console.info("Performing a full space reindex, this could take a while...");
    indexOngoing = true;
    await system.invokeFunction("index.reindexSpace", [true]); // noClean = true
    console.info("Full space index complete.");
    await markFullSpaceIndexComplete(ds);
    indexOngoing = false;
  }
}

export async function markFullSpaceIndexComplete(ds: DataStore) {
  await ds.set(indexVersionKey, desiredIndexVersion);
}
