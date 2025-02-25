import {
  addParentPointers,
  collectNodesOfType,
  findNodeOfType,
  type ParseTree,
  removeParentPointers,
  renderToText,
  traverseTree,
} from "@silverbulletmd/silverbullet/lib/tree";
import {
  encodePageRef,
  parsePageRef,
} from "@silverbulletmd/silverbullet/lib/page_ref";
import { Fragment, renderHtml, type Tag } from "./html_render.ts";
import { isLocalPath } from "@silverbulletmd/silverbullet/lib/resolve";
import type { PageMeta } from "@silverbulletmd/silverbullet/types";
import * as TagConstants from "../../plugs/index/constants.ts";
import { extractHashtag } from "@silverbulletmd/silverbullet/lib/tags";

export type MarkdownRenderOptions = {
  failOnUnknown?: true;
  smartHardBreak?: true;
  annotationPositions?: true;
  documentUrlPrefix?: string;
  preserveAttributes?: true;
  // When defined, use to inline images as data: urls
  translateUrls?: (url: string, type: "link" | "image") => string;
};

function cleanTags(values: (Tag | null)[], cleanWhitespace = false): Tag[] {
  const result: Tag[] = [];
  for (const value of values) {
    if (cleanWhitespace && typeof value === "string" && value.match(/^\s+$/)) {
      continue;
    }
    if (value) {
      result.push(value);
    }
  }
  return result;
}

function preprocess(t: ParseTree) {
  addParentPointers(t);
  traverseTree(t, (node) => {
    if (!node.type) {
      if (node.text?.startsWith("\n")) {
        const prevNodeIdx = node.parent!.children!.indexOf(node) - 1;
        const prevNodeType = node.parent!.children![prevNodeIdx]?.type;
        if (
          prevNodeType?.includes("Heading") || prevNodeType?.includes("Table")
        ) {
          node.text = node.text.slice(1);
        }
      }
    }
    return false;
  });
}

function posPreservingRender(
  t: ParseTree,
  options: MarkdownRenderOptions = {},
): Tag | null {
  const tag = render(t, options);
  if (!options.annotationPositions) {
    return tag;
  }
  if (!tag) {
    return null;
  }
  if (typeof tag === "string") {
    return tag;
  }
  if (t.from) {
    if (!tag.attrs) {
      tag.attrs = {};
    }
    tag.attrs["data-pos"] = "" + t.from;
  }
  return tag;
}

function render(
  t: ParseTree,
  options: MarkdownRenderOptions = {},
): Tag | null {
  if (t.type?.endsWith("Mark") || t.type?.endsWith("Delimiter")) {
    return null;
  }
  switch (t.type) {
    case "Document":
      return {
        name: Fragment,
        body: cleanTags(mapRender(t.children!)),
      };
    case "FrontMatter":
      return null;
    case "CommentBlock":
      // Remove, for now
      return null;
    case "ATXHeading1":
      return {
        name: "h1",
        body: cleanTags(mapRender(t.children!)),
      };
    case "ATXHeading2":
      return {
        name: "h2",
        body: cleanTags(mapRender(t.children!)),
      };
    case "ATXHeading3":
      return {
        name: "h3",
        body: cleanTags(mapRender(t.children!)),
      };
    case "ATXHeading4":
      return {
        name: "h4",
        body: cleanTags(mapRender(t.children!)),
      };
    case "ATXHeading5":
      return {
        name: "h5",
        body: cleanTags(mapRender(t.children!)),
      };
    case "ATXHeading6":
      return {
        name: "h6",
        body: cleanTags(mapRender(t.children!)),
      };
    case "Paragraph":
      return {
        name: "span",
        attrs: {
          class: "p",
        },
        body: cleanTags(mapRender(t.children!)),
      };
    // Code blocks
    case "FencedCode":
    case "CodeBlock": {
      // Clear out top-level indent blocks
      const lang = findNodeOfType(t, "CodeInfo");
      t.children = t.children!.filter((c) => c.type);
      return {
        name: "pre",
        attrs: {
          "data-lang": lang ? lang.children![0].text : undefined,
        },
        body: cleanTags(mapRender(t.children!)),
      };
    }
    case "CodeInfo":
      return null;
    case "CodeText":
      return t.children![0].text!;
    case "Blockquote":
      return {
        name: "blockquote",
        body: cleanTags(mapRender(t.children!)),
      };
    case "HardBreak":
      return {
        name: "br",
        body: "",
      };
    // Basic styling
    case "Emphasis":
      return {
        name: "em",
        body: cleanTags(mapRender(t.children!)),
      };
    case "Highlight":
      return {
        name: "span",
        attrs: {
          class: "highlight",
        },
        body: cleanTags(mapRender(t.children!)),
      };
    case "Strikethrough":
      return {
        name: "del",
        body: cleanTags(mapRender(t.children!)),
      };
    case "InlineCode":
      return {
        name: "tt",
        body: cleanTags(mapRender(t.children!)),
      };
    case "BulletList":
      return {
        name: "ul",
        body: cleanTags(mapRender(t.children!), true),
      };
    case "OrderedList":
      return {
        name: "ol",
        body: cleanTags(mapRender(t.children!), true),
      };
    case "ListItem":
      return {
        name: "li",
        body: cleanTags(mapRender(t.children!), true),
      };
    case "StrongEmphasis":
      return {
        name: "strong",
        body: cleanTags(mapRender(t.children!)),
      };
    case "HorizontalRule":
      return {
        name: "hr",
        body: "",
      };
    case "Link": {
      const linkTextChildren = t.children!.slice(1, -4);
      const urlNode = findNodeOfType(t, "URL");
      if (!urlNode) {
        return renderToText(t);
      }
      let url = urlNode.children![0].text!;
      if (isLocalPath(url)) {
        if (
          options.documentUrlPrefix &&
          !url.startsWith(options.documentUrlPrefix)
        ) {
          url = `${options.documentUrlPrefix}${url}`;
        }
      }
      return {
        name: "a",
        attrs: {
          href: url,
          target: "_blank",
        },
        body: cleanTags(mapRender(linkTextChildren)),
      };
    }
    case "Autolink": {
      const urlNode = findNodeOfType(t, "URL");
      if (!urlNode) {
        return renderToText(t);
      }
      let url = urlNode.children![0].text!;
      if (isLocalPath(url)) {
        if (
          options.documentUrlPrefix &&
          !url.startsWith(options.documentUrlPrefix)
        ) {
          url = `${options.documentUrlPrefix}${url}`;
        }
      }
      return {
        name: "a",
        attrs: {
          href: url,
          target: "_blank",
        },
        body: url,
      };
    }
    case "Image": {
      const altTextNode = findNodeOfType(t, "WikiLinkAlias") ||
        t.children![1];
      let altText = altTextNode && altTextNode.type !== "LinkMark"
        ? renderToText(altTextNode)
        : "";
      const dimReg = /\d*[^\|\s]*?[xX]\d*[^\|\s]*/.exec(altText);
      let style = "";
      if (dimReg) {
        const [, width, widthUnit = "px", height, heightUnit = "px"] =
          dimReg[0].match(/(\d*)(\S*?x?)??[xX](\d*)(.*)?/) ?? [];
        if (width) {
          style += `width: ${width}${widthUnit};`;
        }
        if (height) {
          style += `height: ${height}${heightUnit};`;
        }
        altText = altText.replace(dimReg[0], "").replace("|", "");
      }

      const urlNode = findNodeOfType(t, "WikiLinkPage") ||
        findNodeOfType(t, "URL");
      if (!urlNode) {
        return renderToText(t);
      }
      let url = renderToText(urlNode);
      if (urlNode.type === "WikiLinkPage") {
        url = "/" + url;
      }

      if (
        isLocalPath(url) &&
        options.documentUrlPrefix &&
        !url.startsWith(options.documentUrlPrefix)
      ) {
        url = `${options.documentUrlPrefix}${url}`;
      }

      return {
        name: "img",
        attrs: {
          src: url,
          alt: altText,
          style: style,
        },
        body: "",
      };
    }

    // Custom stuff
    case "WikiLink": {
      const ref = findNodeOfType(t, "WikiLinkPage")!.children![0].text!;
      let linkText = ref.split("/").pop()!;
      const aliasNode = findNodeOfType(t, "WikiLinkAlias");
      if (aliasNode) {
        linkText = aliasNode.children![0].text!;
      }
      const pageRef = parsePageRef(ref);
      return {
        name: "a",
        attrs: {
          href: `/${encodePageRef(pageRef)}`,
          class: "wiki-link",
          "data-ref": ref,
        },
        body: linkText,
      };
    }
    case "NakedURL": {
      const url = t.children![0].text!;
      return {
        name: "a",
        attrs: {
          href: url,
          target: "_blank",
        },
        body: url,
      };
    }
    case "Hashtag": {
      const tagText: string = t.children![0].text!;
      return {
        name: "a",
        attrs: {
          class: "hashtag sb-hashtag",
          "data-tag-name": extractHashtag(tagText),
          href: `/${TagConstants.tagPrefix}${extractHashtag(tagText)}`,
        },
        body: tagText,
      };
    }
    case "Task": {
      let externalTaskRef = "";
      collectNodesOfType(t, "WikiLinkPage").forEach((wikilink) => {
        const pageRef = parsePageRef(wikilink.children![0].text!);
        if (!externalTaskRef && (pageRef.pos !== undefined || pageRef.anchor)) {
          externalTaskRef = wikilink.children![0].text!;
        }
      });

      return {
        name: "span",
        attrs: externalTaskRef
          ? {
            "data-external-task-ref": externalTaskRef,
          }
          : {},
        body: cleanTags(mapRender(t.children!)),
      };
    }
    case "TaskState": {
      // child[0] = marker, child[1] = state, child[2] = marker
      const stateText = t.children![1].text!;
      if ([" ", "x", "X"].includes(stateText)) {
        return {
          name: "input",
          attrs: {
            type: "checkbox",
            checked: stateText !== " " ? "checked" : undefined,
            "data-state": stateText,
          },
          body: "",
        };
      } else {
        return {
          name: "span",
          attrs: {
            class: "task-state",
          },
          body: stateText,
        };
      }
    }
    case "NamedAnchor":
      return {
        name: "a",
        attrs: {
          name: t.children![0].text?.substring(1),
        },
        body: "",
      };
    case "CommandLink": {
      // Child 0 is CommandLinkMark, child 1 is CommandLinkPage
      const command = t.children![1].children![0].text!;
      let commandText = command;
      const aliasNode = findNodeOfType(t, "CommandLinkAlias");
      const argsNode = findNodeOfType(t, "CommandLinkArgs");
      let args: any = [];

      if (argsNode) {
        args = JSON.parse(`[${argsNode.children![0].text!}]`);
      }

      if (aliasNode) {
        commandText = aliasNode.children![0].text!;
      }

      return {
        name: "button",
        attrs: {
          "data-onclick": JSON.stringify(["command", command, args]),
        },
        body: commandText,
      };
    }

    case "DeadlineDate":
      return {
        name: "span",
        attrs: {
          class: "task-deadline",
        },
        body: renderToText(t),
      };

    // Tables
    case "Table":
      return {
        name: "table",
        body: cleanTags(mapRender(t.children!)),
      };
    case "TableHeader":
      return {
        name: "thead",
        body: [
          {
            name: "tr",
            body: cleanTags(mapRender(t.children!), true),
          },
        ],
      };
    case "TableCell":
      return {
        name: "td",
        body: cleanTags(mapRender(t.children!)),
      };
    case "TableRow": {
      const children = t.children!;
      const newChildren: ParseTree[] = [];
      // Ensure there is TableCell in between every delimiter
      let lookingForCell = false;
      for (const child of children) {
        if (child.type === "TableDelimiter" && lookingForCell) {
          // We were looking for a cell, but didn't fine one: empty cell!
          // Let's inject an empty one
          newChildren.push({
            type: "TableCell",
            children: [],
          });
        }
        if (child.type === "TableDelimiter") {
          lookingForCell = true;
        }
        if (child.type === "TableCell") {
          lookingForCell = false;
        }
        newChildren.push(child);
      }
      return {
        name: "tr",
        body: cleanTags(mapRender(newChildren), true),
      };
    }
    case "Attribute":
      if (options.preserveAttributes) {
        return {
          name: "span",
          attrs: {
            class: "attribute",
          },
          body: renderToText(t),
        };
      }
      return null;
    case "Escape": {
      return {
        name: "span",
        attrs: {
          class: "escape",
        },
        body: t.children![0].text!.slice(1),
      };
    }
    case "Entity":
      return t.children![0].text!;

    case "TemplateDirective": {
      return {
        name: "span",
        attrs: {
          class: "template-directive",
        },
        body: renderToText(t),
      };
    }
    case "Superscript":
      return {
        name: "sup",
        body: cleanTags(mapRender(t.children!)),
      };
    case "Subscript":
      return {
        name: "sub",
        body: cleanTags(mapRender(t.children!)),
      };
    case "LuaDirective":
      return {
        name: "span",
        attrs: {
          class: "sb-lua-directive",
        },
        body: renderToText(t),
      };

    // Text
    case undefined:
      return t.text!;
    default:
      if (options.failOnUnknown) {
        removeParentPointers(t);
        console.error("Not handling", JSON.stringify(t, null, 2));
        throw new Error(`Unknown markdown node type ${t.type}`);
      } else {
        // Falling back to rendering verbatim
        removeParentPointers(t);
        console.warn("Not handling", JSON.stringify(t, null, 2));
        return renderToText(t);
      }
  }

  function mapRender(children: ParseTree[]) {
    return children.map((t) => posPreservingRender(t, options));
  }
}

function traverseTag(
  t: Tag,
  fn: (t: Tag) => void,
) {
  fn(t);
  if (typeof t === "string") {
    return;
  }
  if (t.body) {
    for (const child of t.body) {
      traverseTag(child, fn);
    }
  }
}

export function renderMarkdownToHtml(
  t: ParseTree,
  options: MarkdownRenderOptions = {},
  allPages: PageMeta[] = [],
) {
  preprocess(t);
  const htmlTree = posPreservingRender(t, options);
  if (htmlTree) {
    traverseTag(htmlTree, (t) => {
      if (typeof t === "string") {
        return;
      }
      if (t.name === "img" && options.translateUrls) {
        t.attrs!.src = options.translateUrls!(t.attrs!.src!, "image");
      }

      if (t.name === "a" && t.attrs!.href) {
        if (options.translateUrls) {
          t.attrs!.href = options.translateUrls!(t.attrs!.href, "link");
        }
        if (t.attrs!["data-ref"]?.length) {
          const pageRef = parsePageRef(t.attrs!["data-ref"]!);
          const pageMeta = allPages.find((p) => pageRef.page === p.name);
          if (pageMeta) {
            t.body = [(pageMeta.pageDecoration?.prefix ?? "") + t.body];
            if (pageMeta.pageDecoration?.cssClasses) {
              t.attrs!.class += " sb-decorated-object " +
                pageMeta.pageDecoration.cssClasses.join(" ").replaceAll(
                  /[^a-zA-Z0-9-_ ]/g,
                  "",
                );
            }
          }
        }
        if (t.body.length === 0) {
          t.body = [t.attrs!.href];
        }
      }
    });
  }
  return renderHtml(htmlTree);
}
