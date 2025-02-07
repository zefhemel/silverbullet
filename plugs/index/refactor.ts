import { editor, markdown, space } from "@silverbulletmd/silverbullet/syscalls";
import { validatePageName } from "@silverbulletmd/silverbullet/lib/page_ref";
import { getBackLinks, type LinkObject } from "./page_links.ts";
import { queryObjects } from "./api.ts";
import {
  absoluteToRelativePath,
  folderName,
} from "@silverbulletmd/silverbullet/lib/resolve";
import type { ObjectValue } from "@silverbulletmd/silverbullet/types";
import {
  addParentPointers,
  findParentMatching,
  nodeAtPos,
} from "@silverbulletmd/silverbullet/lib/tree";
import type { ParseTree } from "@silverbulletmd/silverbullet/lib/tree";
import { findNodeOfType } from "@silverbulletmd/silverbullet/lib/tree";

/**
 * Renames a single page.
 * @param cmdDef Optional command arguments
 * @param cmdDef.oldPage The current name of the page to rename. Defaults to
 *   the current page selected in the editor.
 * @param cmdDef.page The name to rename the page to. If not provided the
 *   user will be prompted to enter a new name.
 * @returns True if the rename succeeded; otherwise, false.
 */
export async function renamePageCommand(cmdDef: any) {
  const oldName: string = cmdDef.oldPage || await editor.getCurrentPage();
  const newName: string = cmdDef.page ||
    await editor.prompt(`Rename ${oldName} to:`, oldName);
  if (!newName) {
    return false;
  }
  const pageList: [string, string][] = [[oldName + ".md", newName + ".md"]];
  await batchRenameFiles(pageList);
  return true;
}

export async function renamePageLinkCommand() {
  const mdTree = await markdown.parseMarkdown(await editor.getText());
  const link = nodeAtPos(mdTree, await editor.getCursor());
  if (!link) {
    console.error("No link found at cursor position...");
    return;
  }
  console.log("Link node", mdTree);
  addParentPointers(mdTree);
  let node: ParseTree | null = link;
  if (node.type !== "WikiLink") {
    node = findParentMatching(node, (t) => t.type === "WikiLink");
    if (!node) {
      console.error("No link found at cursor position");
      return;
    }
  }
  const wikiLinkPage = findNodeOfType(node, "WikiLinkPage");
  if (!wikiLinkPage) {
    console.error("No link found at cursor position");
    return;
  }
  const oldName = wikiLinkPage.children![0].text!;

  const newName = await editor.prompt(`Rename ${oldName} to:`, oldName);
  if (!newName) {
    return false;
  }
  const pageList: [string, string][] = [[oldName + ".md", newName + ".md"]];
  await batchRenameFiles(pageList);
}

/**
 * Renames a single attachment.
 * @param cmdDef Optional command arguments
 * @param cmdDef.oldAttachment The current name of the attachment to rename.
 * @param cmdDef.attachment The name to rename the attachment to. If not provided the
 *   user will be prompted to enter a new name.
 * @returns True if the rename succeeded; otherwise, false.
 */
export async function renameAttachmentCommand(cmdDef: any) {
  const oldName: string = cmdDef.oldAttachment;
  const newName: string = cmdDef.attachment ||
    await editor.prompt(`Rename ${oldName} to:`, oldName);
  if (!newName) {
    return false;
  }
  const pageList: [string, string][] = [[oldName, newName]];
  await batchRenameFiles(pageList);
  return true;
}

/**
 * Renames any amount of files.
 * If renaming pages, names should be passed with a .md extension
 * @param fileList An array of tuples containing [FileToBeRenamed, NewFileName]
 * @returns True if the rename succeeded; otherwise, false.
 */
export async function batchRenameFiles(fileList: [string, string][]) {
  await editor.save();

  // Skip unchanged names
  fileList = fileList.filter(([oldName, newName]) => {
    if (oldName.trim() === newName.trim()) {
      console.log(`${oldName}'s name unchanged, skipping`);
    } else {
      return [oldName, newName];
    }
  });

  try {
    // Pre-flight checks
    await Promise.all(fileList.map(async ([_oldName, newName]) => {
      try {
        if (newName.endsWith(".md")) {
          validatePageName(newName.slice(0, -3));
          // New name is valid
        }
        // Check if target file already exists
        await space.getFileMeta(newName);
        // If we got here, the file exists, so we error out
        throw new Error(
          `${newName} already exists, cannot rename to existing file.`,
        );
      } catch (e: any) {
        if (e.message === "Not found") {
          // Expected not found error, so we can continue
        } else {
          throw e;
        }
      }
    }));

    // All new names are available, proceeding with rename
    for (const [oldName, newName] of fileList) {
      console.log("Renaming", oldName, "to", newName);
      try {
        if (newName.endsWith(".md")) {
          await renamePage(oldName.slice(0, -3), newName.slice(0, -3));
        } else {
          await renameAttachment(oldName, newName);
        }
      } catch (e: any) {
        if (e.message === "Not found") {
          console.log(`${oldName} does not exist, skipping`);
        } else {
          throw e;
        }
      }
    }

    return true;
  } catch (e: any) {
    await editor.flashNotification(e.message, "error");
    return false;
  }
}

// Rename a page, update any backlinks and linked attachments
async function renamePage(oldName: string, newName: string) {
  let text = await space.readPage(oldName);

  // Update relative links and attachments on this page
  const oldFolder = folderName(oldName);
  const newFolder = folderName(newName);
  const attachmentsToMove = new Set<string>();
  // Links only need to be updated if the folder changes
  if (oldFolder !== newFolder) {
    const linksInPage = await queryObjects<LinkObject>("link", {
      filter: ["=", ["attr", "page"], ["string", oldName]],
    });

    const linksToUpdate: ObjectValue<LinkObject>[] = [];
    for (const link of linksInPage) {
      if (link.toFile && folderName(link.toFile) === oldFolder) {
        const attBackLinks = await getBackLinks(link.toFile);
        if (attBackLinks.filter((a) => a.page !== oldName).length === 0) {
          // Attachments is in the same folder as the page
          // and is only linked to on this page, move it along with the page
          attachmentsToMove.add(link.toFile);
          continue;
        }
      }
      linksToUpdate.push(link);
    }

    // Sort links by position
    linksToUpdate.sort((a, b) => {
      // Backwards to prevent errors from position changes
      return b.pos - a.pos;
    });

    for (const link of linksToUpdate) {
      let newLink = link.toPage || link.toFile!;
      let newTail = text.substring(link.pos);

      // Only relative links need to be updated
      if (/^[^/][^\]]+?(?<!]])\)/.test(newTail)) {
        newLink = absoluteToRelativePath(newName, newLink);
        newTail = newTail.replace(/^.*?(?=@\d*|#|\$|\))/, newLink);
        // Wrap in <> if link has spaces
        if (newLink.includes(" ")) {
          newTail = "<" + newTail.replace(")", ">)");
        }
        text = text.substring(0, link.pos) + newTail;
      }
    }
  }

  // Write the new page
  const newPageMeta = await space.writePage(newName, text);

  // Move attachements along with page
  const batchRenameAttachments: [string, string][] = [];
  for (const att of attachmentsToMove) {
    const newAttName = oldFolder.length === 0
      ? newFolder + "/" + att
      : att.replace(oldFolder, newFolder).replace(/^\//, "");
    batchRenameAttachments.push([att, newAttName]);
  }
  if (batchRenameAttachments.length > 0) {
    await batchRenameFiles(batchRenameAttachments);
  }

  // Navigate to new page if currently viewing old page
  if (await editor.getCurrentPage() === oldName) {
    await editor.navigate({ page: newName, pos: 0 }, true);
  }
  // Handling the edge case of a changing page name just in casing on a case insensitive FS
  const oldPageMeta = await space.getPageMeta(oldName);
  if (oldPageMeta.lastModified !== newPageMeta.lastModified) {
    // If they're the same, let's assume it's the same file (case insensitive FS) and not delete, otherwise...
    await space.deletePage(oldName);
  }

  // Update backlinks to this page
  const updatedRefences = await updateBacklinks(oldName, newName);

  let message = `Renamed ${oldName} to ${newName}`;
  if (updatedRefences > 0) {
    message = `${message}, updated ${updatedRefences} backlinks`;
  }
  if (attachmentsToMove.size > 0) {
    message = `${message}, moved ${attachmentsToMove.size} attachments`;
  }
  await editor.flashNotification(message, "info");
}

// Rename an attachment and update any backlinks
async function renameAttachment(
  oldName: string,
  newName: string,
) {
  // Move the file
  const oldFile = await space.readAttachment(oldName);
  const newFileMeta = await space.writeAttachment(newName, oldFile);

  // Handling the edge case of a changing file name just in casing on a case insensitive FS
  const oldFileMeta = await space.getAttachmentMeta(oldName);
  if (oldFileMeta.lastModified !== newFileMeta.lastModified) {
    // If they're the same, let's assume it's the same file (case insensitive FS) and not delete, otherwise...
    await space.deleteAttachment(oldName);
  }

  // Update any backlinks
  const updatedRefences = await updateBacklinks(oldName, newName);
  let message = `Renamed ${oldName} to ${newName}`;
  if (updatedRefences > 0) {
    message = `${message}, updated ${updatedRefences} backlinks`;
  }
  await editor.flashNotification(message, "info");
}

/**
 * Renames pages based on a prefix string.
 * @param cmdDef Optional command arguments
 * @param cmdDef.oldPrefix The prefix to rename from. If not provided the
 *   user will be prompted to enter a prefix.
 * @param cmdDef.newPrefix The prefix with which to replace the `oldPrefix`
 *   value. If not provided the user will be prompted to enter a new prefix.
 * @param cmdDef.disableConfirmation If false, the user will be prompted
 *   to confirm the rename action; Otherwise no confirmation dialog will
 *   be shown before renaming. Defaults to false.
 * @returns True if the rename succeeded; otherwise, false.
 */
export async function renamePrefixCommand(cmdDef: any) {
  const oldPrefix = cmdDef.oldPrefix ??
    await editor.prompt("Prefix to rename:", "");
  if (!oldPrefix) {
    return false;
  }

  const newPrefix = cmdDef.newPrefix ??
    await editor.prompt("New prefix:", oldPrefix);
  if (!newPrefix) {
    return false;
  }

  const allAttachments = await space.listAttachments();
  const allPages = await space.listPages();
  let allAffectedFiles = allAttachments.map((file) => file.name).filter((
    file,
  ) => file.startsWith(oldPrefix));
  allAffectedFiles = allAffectedFiles.concat(
    allPages.map((page) => page.name + ".md").filter((page) =>
      page.startsWith(oldPrefix)
    ),
  );

  if (
    cmdDef.disableConfirmation !== true && !(await editor.confirm(
      `This will affect ${allAffectedFiles.length} files. Are you sure?`,
    ))
  ) {
    return false;
  }

  const allNewNames: [string, string][] = allAffectedFiles.map((name) => // This may seem naive, but it's actually fine, because we're only renaming the first occurrence (which will be the prefix)
  [name, name.replace(oldPrefix, newPrefix)]);
  await batchRenameFiles(allNewNames);
}

export async function extractToPageCommand() {
  const selection = await editor.getSelection();
  let text = await editor.getText();
  text = text.slice(selection.from, selection.to);

  const match = text.match("#{1,6}\\s+([^\n]*)");

  let newName;
  if (match) {
    newName = match[1];
  } else {
    newName = "new page";
  }
  newName = await editor.prompt(`New page title:`, newName);
  if (!newName) {
    return;
  }

  try {
    // This throws an error if the page does not exist, which we expect to be the case
    await space.getPageMeta(newName);
    // So when we get to this point, we error out
    throw new Error(
      `Page ${newName} already exists, cannot rename to existing page.`,
    );
  } catch (e: any) {
    if (e.message === "Not found") {
      // Expected not found error, so we can continue
    } else {
      await editor.flashNotification(e.message, "error");
      throw e;
    }
  }
  await editor.replaceRange(selection.from, selection.to, `[[${newName}]]`);
  console.log("Writing new page to space");
  await space.writePage(newName, text);
  console.log("Navigating to new page");
  await editor.navigate({ page: newName });
}

/**
 * Updates backlinks across all pages
 * @param oldName Full path to old page/file
 * @param newName Full path to new page/file
 * @returns The number of references updated
 */
async function updateBacklinks(
  oldName: string,
  newName: string,
): Promise<number> {
  // This is the bit where we update all the links
  const backLinks = await getBackLinks(oldName);
  let updatedReferences = 0;

  // Group by page to edit entire page at once
  const backLinksByPage = backLinks.reduce(
    (group: Record<string, LinkObject[]>, link) => {
      const { page } = link;
      group[page] = group[page] ?? [];
      group[page].push(link);
      return group;
    },
    {},
  );

  console.log("All pages containing backlinks", backLinks);
  for (const [pageToEdit, linksInPage] of Object.entries(backLinksByPage)) {
    if (pageToEdit === oldName) {
      continue;
    }

    let text = await space.readPage(pageToEdit);
    if (!text) {
      // Page likely does not exist, but at least we can skip it
      continue;
    }

    // Use indexed positions to replace links
    linksInPage.sort((a, b) => {
      // Backwards to prevent errors from position changes
      return b.pos - a.pos;
    });

    for (const link of linksInPage) {
      let newTail = text.substring(link.pos);
      let newLink = newName;
      if (/^[^\]]+?(?<!]])\)/.test(newTail)) {
        // Is [Markdown link]()
        if (newTail.startsWith("/") || newTail.startsWith("</")) {
          // Is absolute mdlink, update with full path with leading /
          newLink = "/" + newLink;
        } else {
          // Is relative mdlink
          newLink = absoluteToRelativePath(pageToEdit, newLink);
        }
        newTail = newTail.replace(/^.*?(?=@\d*|#|\$|\))/, newLink);

        // Wrap in <> if link has spaces
        if (newLink.includes(" ")) {
          newTail = "<" + newTail.replace(")", ">)");
        }
      } else {
        // Is wikilink, replace with full path
        newTail = newLink + newTail.slice(oldName.length);
      }

      text = text.substring(0, link.pos) + newTail;
      updatedReferences++;
    }
    await space.writePage(pageToEdit, text);
  }
  return updatedReferences;
}
