import { readCodeBlockPage } from "$sb/lib/yaml_page.ts";
import { dataStore, editor } from "$sb/syscalls.ts";

export async function toggleVimMode() {
  let vimMode = await dataStore.get(["vimMode"]);
  vimMode = !vimMode;
  await editor.setUiOption("vimMode", vimMode);
  await dataStore.set([vimMode], vimMode);
}

export async function loadVimRc() {
  const vimMode = await editor.getUiOption("vimMode");
  if (!vimMode) {
    console.log("Not in vim mode");
    return;
  }
  try {
    const vimRc = await readCodeBlockPage("VIMRC");
    if (vimRc) {
      console.log("Now running vim ex commands from VIMRC");
      const lines = vimRc.split("\n");
      for (const line of lines) {
        try {
          console.log("Running vim ex command", line);
          await editor.vimEx(line);
        } catch (e: any) {
          await editor.flashNotification(e.message, "error");
        }
      }
    }
  } catch {
    // No VIMRC page found
  }
}
