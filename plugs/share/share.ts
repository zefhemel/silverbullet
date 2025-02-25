import {
  editor,
  events,
  markdown,
  space,
  system,
} from "@silverbulletmd/silverbullet/syscalls";
import { findNodeOfType, renderToText } from "../../plug-api/lib/tree.ts";
import { replaceNodesMatching } from "../../plug-api/lib/tree.ts";
import type { ParseTree } from "../../plug-api/lib/tree.ts";
import {
  encodePageURI,
  parsePageRef,
} from "@silverbulletmd/silverbullet/lib/page_ref";
import type { EndpointRequest } from "@silverbulletmd/silverbullet/types";
import { localDateString } from "$lib/dates.ts";
import { cleanPageRef } from "@silverbulletmd/silverbullet/lib/resolve";
import { builtinFunctions } from "$lib/builtin_query_functions.ts";
import { renderTheTemplate } from "$common/syscalls/template.ts";

type ShareOption = {
  id: string;
  name: string;
};

export async function shareCommand() {
  await editor.save();
  const pageName = await editor.getCurrentPage();

  const optionResponses: ShareOption[] =
    (await events.dispatchEvent("share:options", pageName)).flat();
  console.log("All options", optionResponses);
  const selectedShareOption: any = await editor.filterBox(
    "Share",
    optionResponses,
    "Pick a share option",
  );
  if (!selectedShareOption) {
    return;
  }
  console.log("Picked", selectedShareOption);

  let text = await editor.getText();
  const selection = await editor.getSelection();
  if (selection.from !== selection.to) {
    text = text.substring(selection.from, selection.to);
  }

  await events.dispatchEvent(
    `share:${selectedShareOption.id}`,
    text,
  );
}

export function clipboardShareOptions() {
  return [
    {
      id: "clean-markdown",
      name: "Copy to clipboard as clean markdown",
    },
    {
      id: "rich-text",
      name: "Copy to clipboard as rich text",
    },
  ];
}

export async function clipboardMarkdownShare(text: string) {
  const pageName = await editor.getCurrentPage();
  const tree = await markdown.parseMarkdown(text);
  let rendered = await system.invokeFunction(
    "markdown.expandCodeWidgets",
    tree,
    pageName,
  );
  rendered = cleanMarkdown(rendered);
  await editor.copyToClipboard(renderToText(rendered).trim());
  await editor.flashNotification("Copied to clipboard!");
}

export function cleanMarkdown(tree: ParseTree): ParseTree {
  replaceNodesMatching(tree, (node) => {
    switch (node.type) {
      case "FrontMatter":
        return null;
      case "WikiLink": {
        const ref = findNodeOfType(node, "WikiLinkPage")!.children![0].text!;
        let linkText = ref.split("/").pop()!;
        const aliasNode = findNodeOfType(node, "WikiLinkAlias");
        if (aliasNode) {
          linkText = aliasNode.children![0].text!;
        }
        const pageRef = parsePageRef(ref);
        return {
          text: `[${linkText}](${
            typeof location !== "undefined" ? location.origin : ""
          }/${encodePageURI(pageRef.page)})`,
        };
      }
      case "NamedAnchor":
        // Just remove these
        return null;
      case "CommandLink": {
        // Child 0 is CommandLinkMark, child 1 is CommandLinkPage
        const command = node.children![1].children![0].text!;
        let commandText = command;
        const aliasNode = findNodeOfType(node, "CommandLinkAlias");

        if (aliasNode) {
          commandText = aliasNode.children![0].text!;
        }

        return {
          text: "`" + commandText + "`",
        };
      }

      case "Attribute":
        // Just remove these
        return null;
    }
  });
  return tree;
}

export async function clipboardRichTextShare(text: string) {
  const pageName = await editor.getCurrentPage();
  const tree = await markdown.parseMarkdown(text);
  let rendered = await system.invokeFunction(
    "markdown.expandCodeWidgets",
    tree,
    pageName,
  );
  rendered = cleanMarkdown(rendered);
  const html = await system.invokeFunction(
    "markdown.markdownToHtml",
    renderToText(rendered),
  );
  console.log("HTML", html);
  await editor.copyToClipboard(new Blob([html], { type: "text/html" }));
  await editor.flashNotification("Copied to rich text to clipboard!");
}

function parseMultipartFormData(body: string, boundary: string) {
  const parts = body.split(`--${boundary}`);
  return parts.slice(1, -1).map((part) => {
    const [headers, content] = part.split("\r\n\r\n");
    const nameMatch = headers.match(/name="([^"]+)"/);
    if (!nameMatch) {
      throw new Error("Could not parse form field name");
    }
    const name = nameMatch[1];
    const value = content.trim();
    return { name, value };
  });
}
export async function handleShareTarget(request: EndpointRequest) {
  console.log("Share target received:", {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });

  try {
    // Parse multipart form data
    const contentType = request.headers["content-type"];
    if (!contentType) {
      throw new Error(
        `No content type found in ${JSON.stringify(request.headers)}`,
      );
    }
    const boundary = contentType.split("boundary=")[1];
    if (!boundary) {
      throw new Error(`No multipart boundary found in ${contentType}`);
    }
    const formData = parseMultipartFormData(request.body, boundary);
    const { title = "", text = "", url = "" } = formData.reduce(
      (acc: Record<string, string>, curr: { name: string; value: string }) => {
        acc[curr.name] = curr.value;
        return acc;
      },
      {},
    );

    // Format the shared content
    const timestamp = localDateString(new Date());
    const sharedContent = `\n\n## ${title}
${text}
${url ? `URL: ${url}` : ""}\nAdded at ${timestamp}`;

    // Get the target page from space config, with fallback
    let targetPage = "Inbox";
    try {
      targetPage = cleanPageRef(
        await renderTheTemplate(
          await system.getSpaceConfig("shareTargetPage", "Inbox"),
          {},
          {},
          builtinFunctions,
        ),
      );
    } catch (e: any) {
      console.error("Error parsing share target page from config", e);
    }

    // Try to read existing page content
    let currentContent = "";
    try {
      currentContent = await space.readPage(targetPage);
    } catch (_e) {
      // If page doesn't exist, create it with a header
      currentContent = `# ${targetPage}\n`;
    }

    // Append the new content
    const newContent = currentContent + sharedContent;

    // Write the updated content back to the page
    await space.writePage(targetPage, newContent);

    // Return a redirect response to the target page
    return {
      status: 303, // "See Other" redirect
      headers: {
        "Location": `/${targetPage}`,
      },
      body: "Content shared successfully",
    };
  } catch (e: any) {
    console.error("Error handling share:", e);
    return {
      status: 500,
      body: "Error processing share: " + e.message,
    };
  }
}
