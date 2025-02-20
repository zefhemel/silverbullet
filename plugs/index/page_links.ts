import {
  collectNodesOfType,
  findNodeOfType,
  renderToText,
  traverseTree,
} from "@silverbulletmd/silverbullet/lib/tree";
import type {
  IndexTreeEvent,
  ObjectValue,
} from "@silverbulletmd/silverbullet/types";
import {
  isLocalPath,
  resolvePath,
} from "@silverbulletmd/silverbullet/lib/resolve";
import { indexObjects, queryObjects } from "./api.ts";
import { extractFrontmatter } from "@silverbulletmd/silverbullet/lib/frontmatter";
import { updateITags } from "@silverbulletmd/silverbullet/lib/tags";
import {
  looksLikePathWithExtension,
  parsePageRef,
} from "@silverbulletmd/silverbullet/lib/page_ref";
import { extractSnippetAroundIndex } from "./snippet_extractor.ts";
import {
  mdLinkRegex,
  wikiLinkRegex,
} from "$common/markdown_parser/constants.ts";
import { space } from "@silverbulletmd/silverbullet/syscalls";

export type LinkObject = ObjectValue<
  {
    //Page Link
    // The page the link points to
    toPage: string;
    // The page the link occurs in
    page: string;
    pos: number;
    snippet: string;
    alias?: string;
    asTemplate: boolean;
    toFile?: never;
  } | {
    // Attachment Link
    // The file the link points to
    toFile: string;
    // The page the link occurs in
    page: string;
    pos: number;
    snippet: string;
    alias?: string;
    asTemplate: boolean;
    toPage?: never;
  }
>;

/**
 * Represents a page that does not yet exist, but is being linked to. A page "aspiring" to be created.
 */
export type AspiringPageObject = ObjectValue<{
  // ref: page@pos
  // The page the link appears on
  page: string;
  // And the position
  pos: number;
  // The page the link points to
  name: string;
}>;

export async function indexLinks({ name, tree }: IndexTreeEvent) {
  const links: ObjectValue<LinkObject>[] = [];
  const frontmatter = await extractFrontmatter(tree);
  const pageText = renderToText(tree);

  traverseTree(tree, (n): boolean => {
    // Index [[WikiLinks]]
    if (n.type === "WikiLink") {
      const wikiLinkPage = findNodeOfType(n, "WikiLinkPage")!;
      const wikiLinkAlias = findNodeOfType(n, "WikiLinkAlias");
      const url = resolvePath(name, "/" + wikiLinkPage.children![0].text!);
      const pos = wikiLinkPage.from!;

      const link: any = {
        ref: `${name}@${pos}`,
        tag: "link",
        snippet: extractSnippetAroundIndex(pageText, pos),
        pos,
        page: name,
        asTemplate: false,
      };
      // Assume link is to an attachment if it has
      // an extension, to a page otherwise
      if (looksLikePathWithExtension(url)) {
        link.toFile = url;
      } else {
        link.toPage = parsePageRef(url).page;
      }
      if (wikiLinkAlias) {
        link.alias = wikiLinkAlias.children![0].text!;
      }
      updateITags(link, frontmatter);
      links.push(link);
      return true;
    }

    // Also index [Markdown style]() links
    if (n.type === "URL") {
      const linkNode = findNodeOfType(n, "URL")!;
      if (!linkNode) {
        return false;
      }
      const text = /\[(?<title>[^\]]*)\]\((?<url>.+)\)/
        .exec(renderToText(linkNode.parent));
      if (!text) {
        return false;
      }
      let [/* fullMatch */, alias, url] = text;

      // Check if local link
      if (!isLocalPath(url)) {
        return false;
      }
      const pos = linkNode.from!;
      url = resolvePath(name, decodeURI(url));

      const link: any = {
        ref: `${name}@${pos}`,
        tag: "link",
        snippet: extractSnippetAroundIndex(pageText, pos),
        pos,
        page: name,
        asTemplate: false,
      };
      // Assume link is to an attachment if it has
      // an extension, to a page otherwise
      if (looksLikePathWithExtension(url)) {
        link.toFile = url;
      } else {
        link.toPage = parsePageRef(url).page;
      }
      if (alias) {
        link.alias = alias;
      }
      updateITags(link, frontmatter);
      links.push(link);
      return true;
    }

    // Also index links used inside query and template fenced code blocks
    if (n.type === "FencedCode") {
      const codeInfo = findNodeOfType(n, "CodeInfo")!;
      if (!codeInfo) {
        return false;
      }
      const codeLang = codeInfo.children![0].text!;
      if (codeLang === "template" || codeLang === "query") {
        const codeText = findNodeOfType(n, "CodeText");
        if (!codeText) {
          return false;
        }
        const code = codeText.children![0].text!;
        const wikiLinkMatches = code.matchAll(wikiLinkRegex);
        for (const match of wikiLinkMatches) {
          const [_fullMatch, firstMark, url, alias, _lastMark] = match;
          const pos = codeText.from! + match.index! + firstMark.length;
          const link: any = {
            ref: `${name}@${pos}`,
            tag: "link",
            page: name,
            snippet: extractSnippetAroundIndex(pageText, pos),
            pos: pos,
            asTemplate: true,
          };
          // Assume link is to an attachment if it has
          // an extension, to a page otherwise
          if (looksLikePathWithExtension(url)) {
            link.toFile = resolvePath(name, "/" + url);
          } else {
            link.toPage = resolvePath(name, "/" + parsePageRef(url).page);
          }
          if (alias) {
            link.alias = alias;
          }
          updateITags(link, frontmatter);
          links.push(link);
        }
        const mdLinkMatches = code.matchAll(mdLinkRegex);
        for (const match of mdLinkMatches) {
          const [_fullMatch, alias, url] = match;
          const pos = codeText.from! + match.index! + 1;
          const link: any = {
            ref: `${name}@${pos}`,
            tag: "link",
            page: name,
            snippet: extractSnippetAroundIndex(pageText, pos),
            pos: pos,
            asTemplate: true,
          };
          if (looksLikePathWithExtension(url)) {
            link.toFile = resolvePath(name, url);
          } else {
            link.toPage = resolvePath(name, parsePageRef(url).page);
          }
          if (alias) {
            link.alias = alias;
          }
          updateITags(link, frontmatter);
          links.push(link);
        }
      }
    }

    // Also index links used inside quoted frontmatter strings like "[[Page]]"
    // must match the full string node, only allowing for quotes and whitespace around it
    if (n.type === "FrontMatter") {
      // The YAML in frontmatter is parsed by CodeMirror itself
      for (const textNode of collectNodesOfType(n, "string")) {
        const text = textNode.children![0].text!;
        const trimmed = text.replace(/^["'\s]*/, "").replace(/["'\s]*$/, "");
        // Make sure we search from the beginning, when reusing a Regex object with global flag
        wikiLinkRegex.lastIndex = 0;
        const match = wikiLinkRegex.exec(text);
        // Search in entire node text to get correct position, but check for full match against trimmed
        if (match && match[0] === trimmed) {
          const [_fullMatch, firstMark, url, alias, _lastMark] = match;
          const pos = textNode.from! + match.index! + firstMark.length;
          const link: any = {
            ref: `${name}@${pos}`,
            tag: "link",
            page: name,
            snippet: extractSnippetAroundIndex(pageText, pos),
            pos: pos,
            asTemplate: false,
          };
          if (looksLikePathWithExtension(url)) {
            link.toFile = resolvePath(name, "/" + url);
          } else {
            link.toPage = resolvePath(name, "/" + parsePageRef(url).page);
          }
          if (alias) {
            link.alias = alias;
          }
          updateITags(link, frontmatter);
          links.push(link);
        }
      }
    }
    return false;
  });

  // console.log("Found", links, "page link(s)");
  if (links.length > 0) {
    await indexObjects(name, links);
  }

  // Now let's check which are aspiring pages
  const aspiringPages: ObjectValue<AspiringPageObject>[] = [];
  for (const link of links) {
    if (link.toPage) {
      // No federated links, nothing with template directives
      if (link.toPage.startsWith("!") || link.toPage.includes("{{")) {
        continue;
      }
      if (!await space.fileExists(`${link.toPage}.md`)) {
        aspiringPages.push({
          ref: `${name}@${link.pos}`,
          tag: "aspiring-page",
          page: name,
          pos: link.pos,
          name: link.toPage,
        } as AspiringPageObject);
      }
    }
  }

  if (aspiringPages.length > 0) {
    await indexObjects(name, aspiringPages);
  }
}

export async function getBackLinks(
  name: string,
): Promise<LinkObject[]> {
  return (await queryObjects<LinkObject>("link", {
    filter: ["or", ["=", ["attr", "toPage"], ["string", name]], ["=", [
      "attr",
      "toFile",
    ], ["string", name]]],
  }));
}
