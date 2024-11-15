import {
  asset,
  clientStore,
  editor,
  markdown,
  system,
} from "@silverbulletmd/silverbullet/syscalls";
import { renderMarkdownToHtml } from "./markdown_render.ts";
import {
  isLocalPath,
  resolvePath,
} from "@silverbulletmd/silverbullet/lib/resolve";
import { expandCodeWidgets } from "./api.ts";

export async function updateMarkdownPreview() {
  if (!(await clientStore.get("enableMarkdownPreview"))) {
    return;
  }
  const currentPage = await editor.getCurrentPage();
  const text = await editor.getText();
  const mdTree = await markdown.parseMarkdown(text);
  // const cleanMd = await cleanMarkdown(text);
  const css = await asset.readAsset("markdown", "assets/preview.css");
  const js = await asset.readAsset("markdown", "assets/preview.js");

  await expandCodeWidgets(mdTree, currentPage);
  const html = renderMarkdownToHtml(mdTree, {
    smartHardBreak: true,
    annotationPositions: true,
    translateUrls: (url) => {
      if (isLocalPath(url)) {
        url = resolvePath(currentPage, decodeURI(url));
      }
      return url;
    },
  });
  const customStyles = await editor.getUiOption("customStyles");
  const toolbar = renderToolbar();
  await editor.showPanel(
    "rhs",
    2,
    `
      <link rel="stylesheet" href=".client/main.css" />
      <style>
        ${css}
        ${customStyles ?? ""}
      </style>

      <div id="root" class="sb-preview">${toolbar}${html}</div>
    `,
    js,
  );
}

function renderToolbar(): string {
  return `<div class="sb-markdown-toolbar">
            <button onClick="window.print()">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                  class="feather feather-printer">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
            </button>
          </div>`;
}

export async function previewClickHandler(e: any) {
  const [eventName, arg] = JSON.parse(e);
  // console.log("Got click", eventName, arg);
  switch (eventName) {
    case "pos":
      // console.log("Moving cursor to", +arg);
      await editor.moveCursor(+arg, true);
      break;
    case "command":
      await system.invokeCommand(arg);
      break;
  }
}
