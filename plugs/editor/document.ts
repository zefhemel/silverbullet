import { editor, space } from "@silverbulletmd/silverbullet/syscalls";

export async function deleteDocument() {
  const documentName = await editor.getCurrentPath();
  if (
    !await editor.confirm(
      `Are you sure you would like to delete ${documentName}?`,
    )
  ) {
    return;
  }
  console.log("Navigating to index page");
  await editor.navigate({ kind: "page", page: "" });
  console.log("Deleting document from space");
  await space.deleteDocument(documentName);
}
