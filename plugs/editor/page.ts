import { editor, space } from "@silverbulletmd/silverbullet/syscalls";
import { isFederationPath } from "@silverbulletmd/silverbullet/lib/resolve";

export async function deletePage() {
  const pageName = await editor.getCurrentPage();
  if (
    !await editor.confirm(`Are you sure you would like to delete ${pageName}?`)
  ) {
    return;
  }
  console.log("Navigating to index page");
  await editor.navigate({ kind: "page", page: "" });
  console.log("Deleting page from space");
  await space.deletePage(pageName);
}

export async function copyPage(
  _def: any,
  sourcePage?: string,
  toName?: string,
) {
  const currentPage = await editor.getCurrentPage();
  const fromName = sourcePage || currentPage;
  let suggestedName = toName || fromName;

  if (isFederationPath(fromName)) {
    const pieces = fromName.split("/");
    suggestedName = pieces.slice(1).join("/");
  }
  const newName = await editor.prompt(`Copy to page:`, suggestedName);

  if (!newName) {
    return;
  }

  try {
    // This throws an error if the page does not exist, which we expect to be the case
    await space.getPageMeta(newName);
    // So when we get to this point, we error out
    throw new Error(
      `"${newName}" already exists, cannot copy to existing page.`,
    );
  } catch (e: any) {
    if (e.message === "Not found") {
      // Expected not found error, so we can continue
    } else {
      await editor.flashNotification(e.message, "error");
      throw e;
    }
  }

  const text = await space.readPage(fromName);

  console.log("Writing new page to space");
  await space.writePage(newName, text);

  if (currentPage === fromName) {
    // If we're copying the current page, navigate there
    console.log("Navigating to new page");
    await editor.navigate({ kind: "page", page: newName });
  } else {
    // Otherwise just notify of success
    await editor.flashNotification("Page copied successfully");
  }
}
