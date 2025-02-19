import { editor, space } from "@silverbulletmd/silverbullet/syscalls";

export async function deleteAttachment() {
  const attachmentName = await editor.getCurrentPath();
  if (
    !await editor.confirm(
      `Are you sure you would like to delete ${attachmentName}?`,
    )
  ) {
    return;
  }
  console.log("Navigating to index page");
  await editor.navigate({ kind: "page", page: "" });
  console.log("Deleting page from space");
  await space.deleteAttachment(attachmentName);
}
