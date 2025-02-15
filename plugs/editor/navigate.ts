import type { ClickEvent } from "../../plug-api/types.ts";
import { extractHashtag } from "../../plug-api/lib/tags.ts";
import {
  editor,
  markdown,
  system,
} from "@silverbulletmd/silverbullet/syscalls";
import {
  addParentPointers,
  findNodeOfType,
  findParentMatching,
  nodeAtPos,
  type ParseTree,
} from "@silverbulletmd/silverbullet/lib/tree";
import {
  isLocalPath,
  resolvePath,
} from "@silverbulletmd/silverbullet/lib/resolve";
import {
  parseLocationRef,
  parsePageRef,
} from "@silverbulletmd/silverbullet/lib/page_ref";
import { tagPrefix } from "../index/constants.ts";

async function actionClickOrActionEnter(
  mdTree: ParseTree | null,
  inNewWindow = false,
) {
  if (!mdTree) {
    return;
  }
  const navigationNodeFinder = (t: ParseTree) =>
    [
      "WikiLink",
      "Link",
      "Image",
      "URL",
      "NakedURL",
      "Link",
      "CommandLink",
      "PageRef",
      "Hashtag",
    ]
      .includes(
        t.type!,
      );
  if (!navigationNodeFinder(mdTree)) {
    mdTree = findParentMatching(mdTree, navigationNodeFinder);
    if (!mdTree) {
      return;
    }
  }
  const currentPage = await editor.getCurrentPage();
  switch (mdTree.type) {
    case "WikiLink": {
      const link = mdTree.children![1]!.children![0].text!;
      const currentPath = await editor.getCurrentPath();
      const locationRef = parseLocationRef(link);
      locationRef.page = resolvePath(currentPage, "/" + locationRef.page);
      if (!locationRef.page) {
        locationRef.page = currentPath;
      }
      // This is an explicit navigate, move to the top
      if (locationRef.kind === "page" && locationRef.pos === undefined) {
        locationRef.pos = 0;
      }
      return editor.navigate(locationRef, false, inNewWindow);
    }
    case "PageRef": {
      const pageName = parsePageRef(mdTree.children![0].text!).page;
      return editor.navigate(
        { kind: "page", page: pageName, pos: 0 },
        false,
        inNewWindow,
      );
    }
    case "NakedURL":
    case "URL":
      return editor.openUrl(mdTree.children![0].text!);
    case "Image":
    case "Link": {
      const urlNode = findNodeOfType(mdTree, "URL");
      if (!urlNode) {
        return;
      }
      const url = urlNode.children![0].text!;
      if (url.length <= 1) {
        return editor.flashNotification("Empty link, ignoring", "error");
      }
      if (isLocalPath(url)) {
        if (/\.[a-zA-Z0-9>]+$/.test(url)) {
          return editor.openUrl(
            resolvePath(currentPage, decodeURI(url)),
          );
        } else {
          return editor.navigate(
            parsePageRef(resolvePath(currentPage, decodeURI(url))),
            false,
            inNewWindow,
          );
        }
      } else {
        return editor.openUrl(url);
      }
    }
    case "CommandLink": {
      const commandName = mdTree.children![1]!.children![0].text!;
      const argsNode = findNodeOfType(mdTree, "CommandLinkArgs");
      const argsText = argsNode?.children?.[0]?.text;
      // Assume the arguments are can be parsed as the innards of a valid JSON list
      try {
        const args = argsText ? JSON.parse(`[${argsText}]`) : [];
        await system.invokeCommand(commandName, args);
      } catch (e: any) {
        await editor.flashNotification(
          `Error parsing command link arguments: ${e.message}`,
          "error",
        );
      }
      break;
    }
    case "Hashtag": {
      const hashtag = extractHashtag(mdTree.children![0].text!);
      await editor.navigate(
        { kind: "page", page: `${tagPrefix}${hashtag}`, pos: 0 },
        false,
        inNewWindow,
      );
      break;
    }
  }
}

export async function linkNavigate() {
  const mdTree = await markdown.parseMarkdown(await editor.getText());
  const newNode = nodeAtPos(mdTree, await editor.getCursor());
  addParentPointers(mdTree);
  await actionClickOrActionEnter(newNode);
}

export async function clickNavigate(event: ClickEvent) {
  // Navigate by default, don't navigate when Alt is held
  if (event.altKey) {
    return;
  }
  const mdTree = await markdown.parseMarkdown(await editor.getText());
  addParentPointers(mdTree);
  const newNode = nodeAtPos(mdTree, event.pos);
  await actionClickOrActionEnter(newNode, event.ctrlKey || event.metaKey);
}

export async function navigateCommand(cmdDef: any) {
  await editor.navigate({ kind: "page", page: cmdDef.page, pos: 0 });
}

export async function navigateToPage(_cmdDef: any, pageName: string) {
  await editor.navigate({ kind: "page", page: pageName, pos: 0 });
}

export async function navigateToURL(_cmdDef: any, url: string) {
  await editor.openUrl(url, false);
}

export async function navigateBack() {
  await editor.goHistory(-1);
}

export async function navigateForward() {
  await editor.goHistory(1);
}
