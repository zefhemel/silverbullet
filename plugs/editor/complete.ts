import type {
  CompleteEvent,
  DocumentMeta,
  FileMeta,
  PageMeta,
  QueryExpression,
} from "@silverbulletmd/silverbullet/types";
import { listFilesCached } from "../federation/federation.ts";
import { queryObjects } from "../index/plug_api.ts";
import { folderName } from "@silverbulletmd/silverbullet/lib/resolve";
import type { AspiringPageObject } from "../index/page_links.ts";
import { localDateString } from "$lib/dates.ts";

// A meta page is a page tagged with either #template or #meta
const isMetaPageFilter: QueryExpression = ["or", ["=", ["attr", "tags"], [
  "string",
  "template",
]], ["=", [
  "attr",
  "tags",
], ["string", "meta"]]];

// Completion
export async function pageComplete(completeEvent: CompleteEvent) {
  // Try to match [[wikilink]]
  let isWikilink = true;
  let match = /\[\[([^\]@$#:\{}]*)$/.exec(completeEvent.linePrefix);
  if (!match) {
    // Try to match [markdown link]()
    match = /\[.*\]\(([^\]\)@$#:\{}]*)$/.exec(completeEvent.linePrefix);
    isWikilink = false;
  }
  if (!match) {
    return null;
  }

  const prefix = match[1];

  let allPages: (PageMeta | DocumentMeta)[] = [];

  if (prefix.startsWith("^")) {
    // A carrot prefix means we're looking for a meta page
    allPages = await queryObjects<PageMeta>("page", {
      filter: isMetaPageFilter,
    }, 5);
    // Let's prefix the names with a caret to make them match
    allPages = allPages.map((page) => ({
      ...page,
      name: "^" + page.name,
    }));
  } // Let's try to be smart about the types of completions we're offering based on the context
  else if (
    completeEvent.parentNodes.find((node) => node.startsWith("FencedCode")) &&
    // either a render [[bla]] clause
    /(render\s+|template\()\[\[/.test(
      completeEvent.linePrefix,
    )
  ) {
    // We're quite certainly in a template context, let's only complete templates
    allPages = await queryObjects<PageMeta>("template", {}, 5);
  } else if (
    completeEvent.parentNodes.find((node) =>
      node.startsWith("FencedCode:include") ||
      node.startsWith("FencedCode:template")
    )
  ) {
    // Include both pages and meta in page completion in ```include and ```template blocks
    allPages = await queryObjects<PageMeta>("page", {}, 5);
  } else {
    // This is the most common case, we're combining three types of completions here:
    allPages = (await Promise.all([
      // All non-meta pages
      queryObjects<PageMeta>("page", {
        filter: ["not", isMetaPageFilter],
      }, 5),
      // All documents
      queryObjects<DocumentMeta>("document", {
        // All documents that do not start with a _ (internal documents)
        filter: ["!=~", ["attr", "name"], ["regexp", "^_", ""]],
      }, 5),
      // And all links to non-existing pages (to augment the existing ones)
      queryObjects<AspiringPageObject>("aspiring-page", {
        distinct: true,
        select: [{ name: "name" }],
      }, 5).then((aspiringPages) =>
        // Rewrite them to PageMeta shaped objects
        aspiringPages.map((aspiringPage): PageMeta => ({
          ref: aspiringPage.name,
          tag: "page",
          tags: ["non-existing"], // Picked up later in completion
          name: aspiringPage.name,
          created: "",
          lastModified: "",
          perm: "rw",
        }))
      ),
    ])).flat();
  }

  // Don't complete hidden pages
  allPages = allPages.filter((page) => !(page.pageDecoration?.hide === true));

  if (prefix.startsWith("!")) {
    // Federation!
    // Let's see if this URI is complete enough to try to fetch index.json
    if (prefix.includes("/")) {
      // Yep
      const domain = prefix.split("/")[0];
      // Cached listing
      const federationPages = (await listFilesCached(domain)).filter((fm) =>
        fm.name.endsWith(".md")
      ).map(fileMetaToPageMeta);
      if (federationPages.length > 0) {
        allPages = allPages.concat(federationPages);
      }
    }
  }

  const folder = folderName(completeEvent.pageName);

  return {
    from: completeEvent.pos - prefix.length,
    options: allPages.map((pageMeta) => {
      const completions: any[] = [];
      const namePrefix = (pageMeta as PageMeta).pageDecoration?.prefix || "";
      const cssClass = ((pageMeta as PageMeta).pageDecoration?.cssClasses || [])
        .join(" ").replaceAll(/[^a-zA-Z0-9-_ ]/g, "");

      if (isWikilink) {
        // A [[wikilink]]
        if (pageMeta.displayName) {
          const decoratedName = namePrefix + pageMeta.displayName;
          let boost = new Date(pageMeta.lastModified).getTime();
          if (pageMeta._isAspiring) {
            boost = -Infinity;
          }
          completions.push({
            label: pageMeta.displayName,
            displayLabel: decoratedName,
            boost,
            apply: pageMeta.tag === "template"
              ? pageMeta.name
              : `${pageMeta.name}|${pageMeta.displayName}`,
            detail: `displayName for: ${pageMeta.name}`,
            type: "page",
            cssClass,
          });
        }
        if (Array.isArray(pageMeta.aliases)) {
          for (const alias of pageMeta.aliases) {
            const decoratedName = namePrefix + alias;
            completions.push({
              label: alias,
              displayLabel: decoratedName,
              boost: new Date(pageMeta.lastModified).getTime(),
              apply: pageMeta.tag === "template"
                ? pageMeta.name
                : `${pageMeta.name}|${alias}`,
              detail: `alias to: ${pageMeta.name}`,
              type: "page",
              cssClass,
            });
          }
        }
        const decoratedName = namePrefix + pageMeta.name;
        completions.push({
          label: pageMeta.name,
          displayLabel: decoratedName,
          boost: new Date(pageMeta.lastModified).getTime(),
          detail: pageMeta.tags?.includes("non-existing")
            ? "Linked but not created"
            : undefined,
          type: "page",
          cssClass,
        });
      } else {
        // A markdown link []()
        let labelText = pageMeta.name;
        let boost = new Date(pageMeta.lastModified).getTime();
        // Relative path if in the same folder or a subfolder
        if (folder.length > 0 && labelText.startsWith(folder)) {
          labelText = labelText.slice(folder.length + 1);
          boost = boost * 1.1;
        } else {
          // Absolute path otherwise
          labelText = "/" + labelText;
        }
        completions.push({
          label: labelText,
          displayLabel: namePrefix + labelText,
          boost: boost,
          apply: labelText.includes(" ") ? "<" + labelText + ">" : labelText,
          type: "page",
          cssClass,
        });
      }
      return completions;
    }).flat(),
  };
}

function fileMetaToPageMeta(fileMeta: FileMeta): PageMeta {
  const name = fileMeta.name.substring(0, fileMeta.name.length - 3);
  return {
    ...fileMeta,
    ref: fileMeta.name,
    tag: "page",
    name,
    created: localDateString(new Date(fileMeta.created)),
    lastModified: localDateString(new Date(fileMeta.lastModified)),
  } as PageMeta;
}
