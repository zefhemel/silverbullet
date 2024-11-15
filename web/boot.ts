import { safeRun } from "../lib/async.ts";
import { Client } from "./client.ts";
import { toRealUrl } from "../lib/url_hack.ts";

const syncMode = globalThis.silverBulletConfig.syncOnly ||
  !!localStorage.getItem("syncMode");

safeRun(async () => {
  console.log(
    "Booting SilverBullet client",
    syncMode ? "in Sync Mode" : "in Online Mode",
  );

  if (globalThis.silverBulletConfig.readOnly) {
    console.log("Running in read-only mode");
  }

  const client = new Client(
    document.getElementById("sb-root")!,
    syncMode,
    globalThis.silverBulletConfig.readOnly,
  );
  // @ts-ignore: on purpose
  globalThis.client = client;
  await client.init();
});

if (navigator.serviceWorker) {
  navigator.serviceWorker
    .register(new URL(toRealUrl("/service_worker.js"), location.href), {
      type: "module",
    })
    .then(() => {
      console.log("Service worker registered...");
    });
  if (syncMode) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.active!.postMessage({
        type: "config",
        config: globalThis.silverBulletConfig,
      });
    });
  }
} else {
  console.warn(
    "Not launching service worker, likely because not running from localhost or over HTTPs. This means SilverBullet will not be available offline.",
  );
}

if (!globalThis.indexedDB) {
  alert(
    "SilverBullet requires IndexedDB to operate and it is not available in your browser. Please use a recent version of Chrome, Firefox (not in private mode) or Safari.",
  );
}
