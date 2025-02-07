import { FilterList } from "./filter.tsx";
import type { FilterOption } from "@silverbulletmd/silverbullet/type/client";
import type {
  CompletionContext,
  CompletionResult,
} from "@codemirror/autocomplete";
import type { AttachmentMeta, PageMeta } from "@silverbulletmd/silverbullet/types";
import { tagRegex as mdTagRegex } from "$common/markdown_parser/constants.ts";
import { extractHashtag } from "@silverbulletmd/silverbullet/lib/tags";

const tagRegex = new RegExp(mdTagRegex.source, "g");

export function PageNavigator({
  allPages,
  allAttachments,
  onNavigate,
  onModeSwitch,
  completer,
  vimMode,
  mode,
  darkMode,
  currentPage,
}: {
  allAttachments: AttachmentMeta[];
  allPages: PageMeta[];
  vimMode: boolean;
  darkMode: boolean;
  mode: "page" | "meta" | "attachment" | "all";
  onNavigate: (page: string | undefined, type: "attachment" | "page") => void;
  onModeSwitch: (mode: "page" | "meta" | "attachment" | "all") => void;
  completer: (context: CompletionContext) => Promise<CompletionResult | null>;
  currentPage?: string;
}) {
  const options: FilterOption[] = [];

  if (mode === "attachment" || mode === "all") {
    for (const attachmentMeta of allAttachments) {
      const orderId = -new Date(attachmentMeta.lastModified).getTime();

      // Can't really at tags to attachments as of right now, but maybe in the future
      let description: string | undefined;
      if (attachmentMeta.tags) {
        description = (description || "") +
        attachmentMeta.tags.map((tag) => `#${tag}`).join(" ");
      }

      options.push({
        type: "attachment",
        ...attachmentMeta,
        name: attachmentMeta.name,
        description,
        orderId: orderId,
        hint: attachmentMeta.name.split(".").pop()?.toUpperCase(),
        hintInactive: true,
      });
    }
  }

  if (mode !== "attachment") {
    for (const pageMeta of allPages) {
      // Sanitize the page name
      if (!pageMeta.name) {
        pageMeta.name = pageMeta.ref;
      }
      // Order by last modified date in descending order
      let orderId = -new Date(pageMeta.lastModified).getTime();
      // Unless it was opened in this session
      if (pageMeta.lastOpened) {
        orderId = -pageMeta.lastOpened;
      }
      // Or it's the currently open page
      if (currentPage && currentPage === pageMeta.name || pageMeta._isAspiring) {
        // ... then we put it all the way to the end
        orderId = Infinity;
      }
      const cssClass = (pageMeta.pageDecoration?.cssClasses || []).join(" ")
        .replaceAll(/[^a-zA-Z0-9-_ ]/g, "");

      if (mode === "page") {
        // Special behavior for regular pages
        let description: string | undefined;
        let aliases: string[] = [];
        if (pageMeta.displayName) {
          aliases.push(pageMeta.displayName);
        }
        if (Array.isArray(pageMeta.aliases)) {
          aliases = aliases.concat(pageMeta.aliases);
        }
        if (aliases.length > 0) {
          description = "(a.k.a. " + aliases.join(", ") + ") ";
        }
        if (pageMeta.tags) {
          description = (description || "") +
            pageMeta.tags.map((tag) => `#${tag}`).join(" ");
        }
        options.push({
          type: "page",
          ...pageMeta,
          name: (pageMeta.pageDecoration?.prefix ?? "") + pageMeta.name,
          description,
          orderId: orderId,
          hint: pageMeta._isAspiring ? "Create page" : undefined,
          cssClass,
        });
      } else if (mode === "meta") {
        // Special behavior for #template and #meta pages
        if (pageMeta._isAspiring) {
          // Skip over broken links
          continue;
        }
        options.push({
          type: "page",
          ...pageMeta,
          // Use the displayName or last bit of the path as the name
          name: pageMeta.displayName || pageMeta.name.split("/").pop()!,
          // And use the full path as the description
          description: pageMeta.name,
          hint: pageMeta.tags![0],
          orderId: orderId,
          cssClass,
        });
      } else { // all
        // In mode "all" just show the full path and all tags
        let description: string | undefined;
        if (pageMeta.tags) {
          description = (description || "") +
            pageMeta.tags.map((tag) => `#${tag}`).join(" ");
        }
        options.push({
          type: "page",
          ...pageMeta,
          name: pageMeta.name,
          description,
          orderId: orderId,
          cssClass,
        });
      }
    }
  }

  let completePrefix = currentPage + "/";
  if (currentPage && currentPage.includes("/")) {
    const pieces = currentPage.split("/");
    completePrefix = pieces.slice(0, pieces.length - 1).join("/") + "/";
  } else if (currentPage && currentPage.includes(" ")) {
    completePrefix = currentPage.split(" ")[0] + " ";
  }

  const allowNew = mode !== "attachment";
  const creatablePageNoun = mode !== "all" ? mode : "page";
  const openablePageNoun = mode !== "all" ? mode : "page or attachment";

  return (
    <FilterList
      placeholder={mode === "page"
        ? "Page"
        : (mode === "meta"
          ? "#template or #meta page"
          : (mode === "attachment"
            ? "Attachment"
            : "Any page or Attachment, also hidden"))}
      label="Open"
      options={options}
      vimMode={vimMode}
      darkMode={darkMode}
      completer={completer}
      phrasePreprocessor={(phrase) => {
        phrase = phrase.replaceAll(tagRegex, "").trim();
        return phrase;
      }}
      onKeyPress={(key, text) => {
        // Pages cannot start with ^, as documented in Page Name Rules
        if (key === "^" && text === "^") {
          switch (mode) {
            case "page":
              onModeSwitch("meta");
              break;
            case "meta":
              onModeSwitch("attachment");
              break;
            case "attachment":
              onModeSwitch("all");
              break;
            case "all":
              onModeSwitch("page");
              break;
          }
        }
      }}
      preFilter={(options, phrase) => {
        if (mode === "page") {
          const allTags = phrase.match(tagRegex);
          if (allTags) {
            // Search phrase contains hash tags, let's pre-filter the results based on this
            const filterTags = allTags.map((t) => extractHashtag(t));
            options = options.filter((pageMeta) => {
              if (!pageMeta.tags) {
                return false;
              }
              return filterTags.every((tag) =>
                pageMeta.tags.find((itemTag: string) => itemTag.startsWith(tag))
              );
            });
          }
          // Remove pages that are tagged as templates or meta
          options = options.filter((pageMeta) => {
            return !pageMeta.tags?.includes("template") &&
              !pageMeta.tags?.includes("meta");
          });
        } else if (mode === "meta") {
          // Filter on pages tagged with "template" or "meta"
          options = options.filter((pageMeta) => {
            return pageMeta.tags?.includes("template") ||
              pageMeta.tags?.includes("meta");
          });
        }

        if (mode !== "all") {
          // Filter out hidden pages
          options = options.filter((page) =>
            !(page.pageDecoration?.hide === true)
          );
        }
        return options;
      }}
      allowNew
      helpText={`Press <code>Enter</code> to open the selected ${openablePageNoun}` + (allowNew ? `, or <code>Shift-Enter</code> to create a new ${creatablePageNoun} with this exact name.` : "")}
      newHint={`Create ${creatablePageNoun}`}
      completePrefix={completePrefix}
      onSelect={(opt) => {
        onNavigate(opt?.ref || opt?.name, opt?.type);
      }}
    />
  );
}
