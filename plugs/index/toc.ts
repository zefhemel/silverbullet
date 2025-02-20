import { editor, markdown, YAML } from "@silverbulletmd/silverbullet/syscalls";
import type { CodeWidgetContent } from "@silverbulletmd/silverbullet/types";
import { stripMarkdown } from "@silverbulletmd/silverbullet/lib/markdown";
import { traverseTree } from "@silverbulletmd/silverbullet/lib/tree";

type Header = {
  name: string;
  pos: number;
  level: number;
};

type TocConfig = {
  // Only show the TOC if there are at least this many headers
  minHeaders?: number;
  // Don't show the TOC if there are more than this many headers
  maxHeaders?: number;
  header?: boolean;
  headerText?: string;
};

export async function widget(
  bodyText: string,
): Promise<CodeWidgetContent | null> {
  let config: TocConfig = {};
  if (bodyText.trim() !== "") {
    config = await YAML.parse(bodyText);
  }

  const page = await editor.getCurrentPage();
  const text = await editor.getText();
  const tree = await markdown.parseMarkdown(text);
  const headers: Header[] = [];
  traverseTree(tree, (n) => {
    if (n.type?.startsWith("ATXHeading")) {
      headers.push({
        name: n.children!
          .slice(1)
          .map(stripMarkdown)
          .join("")
          .trim(),
        pos: n.from!,
        level: +n.type[n.type.length - 1],
      });

      return true;
    }
    return false;
  });

  if (headers.length === 0) {
    return null;
  }

  if (config.minHeaders && headers.length < config.minHeaders) {
    // Not enough headers, not showing TOC
    return null;
  }
  if (config.maxHeaders && headers.length > config.maxHeaders) {
    // Too many headers, not showing TOC
    return null;
  }
  let headerText = config.headerText ?? "# Table of Contents\n";
  if (config.header === false) {
    headerText = "";
  }
  // console.log("Headers", headers);
  // Adjust level down if only sub-headers are used
  const minLevel = headers.reduce(
    (min, header) => Math.min(min, header.level),
    6,
  );
  const renderedMd = headerText +
    headers.map((header) =>
      `${
        " ".repeat((header.level - minLevel) * 2)
      }* [[${page}@${header.pos}|${header.name}]]`
    ).join("\n");
  // console.log("Markdown", renderedMd);
  return {
    markdown: renderedMd,
    buttons: [
      {
        description: "Bake result",
        svg:
          `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-align-left"><line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg>`,
        invokeFunction: ["query.bakeButton", bodyText],
      },
      {
        description: "Edit",
        svg:
          `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
        invokeFunction: ["query.editButton", bodyText],
      },
      {
        description: "Reload",
        svg:
          `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-refresh-cw"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`,
        invokeFunction: ["index.refreshWidgets"],
      },
    ],
  };
}
