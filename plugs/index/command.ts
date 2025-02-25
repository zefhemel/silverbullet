import {
  editor,
  events,
  markdown,
  mq,
  space,
  system,
} from "@silverbulletmd/silverbullet/syscalls";
import type { IndexEvent, MQMessage } from "@silverbulletmd/silverbullet/types";
import { isTemplate } from "$lib/cheap_yaml.ts";
import { sleep } from "$lib/async.ts";
import { indexDocument } from "./document.ts";
import { clearFileIndex } from "./api.ts";

export async function reindexCommand() {
  await editor.flashNotification("Performing full page reindex...");
  await system.invokeFunction("index.reindexSpace");
  await editor.flashNotification("Done with page index!");
}

export async function reindexSpace(noClear = false) {
  if (await system.getMode() === "ro") {
    console.info("Not reindexing because we're in read-only mode");
    return;
  }
  if (!noClear) {
    console.log("Clearing page index...");
    // Executed this way to not have to embed the search plug code here
    await system.invokeFunction("index.clearIndex");
  }
  // Pre-index SETTINGS page to get useful settings
  console.log("Indexing SETTINGS page");
  await indexPage("SETTINGS");

  const files = await space.listFiles();
  console.log("Queing", files.length, "pages to be indexed.");

  // Queue all file names to be indexed
  await mq.batchSend("indexQueue", files.map((file) => file.name));

  // Now let's wait for the processing to finish
  let queueStats = await mq.getQueueStats("indexQueue");
  while (queueStats.queued > 0 || queueStats.processing > 0) {
    await sleep(500);
    queueStats = await mq.getQueueStats("indexQueue");
  }
  // And notify the user
  console.log("Indexing completed!");
}

export async function processIndexQueue(messages: MQMessage[]) {
  for (const message of messages) {
    let name: string = message.body;
    if (name.startsWith("_plug/")) {
      continue;
    }
    console.log(`Indexing file ${name}`);
    if (name.endsWith(".md")) {
      name = name.slice(0, -3);
      await indexPage(name);
    } else {
      await indexDocument(name);
    }
  }
}

async function indexPage(name: string) {
  const text = await space.readPage(name);
  const parsed = await markdown.parseMarkdown(text);
  if (isTemplate(text)) {
    await events.dispatchEvent("page:indexTemplate", {
      name,
      tree: parsed,
    });
  } else {
    await events.dispatchEvent("page:index", {
      name,
      tree: parsed,
    });
  }
}

export async function parseIndexTextRepublish({ name, text }: IndexEvent) {
  if (await system.getMode() === "ro") {
    console.info("Not reindexing", name, "because we're in read-only mode");
    return;
  }
  const parsed = await markdown.parseMarkdown(text);

  // First clear the old file index entries
  await clearFileIndex(name);

  if (isTemplate(text)) {
    // console.log("Indexing", name, "as template");
    await events.dispatchEvent("page:indexTemplate", {
      name,
      tree: parsed,
    });
  } else {
    // console.log("Indexing", name, "as page");
    await events.dispatchEvent("page:index", {
      name,
      tree: parsed,
    });
  }
}
