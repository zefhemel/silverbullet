import { editor, space, system } from "@silverbulletmd/silverbullet/syscalls";
import type { UploadFile } from "@silverbulletmd/silverbullet/types";
import { defaultLinkStyle, maximumDocumentSize } from "../../web/constants.ts";
import { resolvePath } from "@silverbulletmd/silverbullet/lib/resolve";
import { encodePageURI } from "@silverbulletmd/silverbullet/lib/page_ref";

export async function saveFile(file: UploadFile) {
  const maxSize = await system.getSpaceConfig(
    "maximumDocumentSize",
    maximumDocumentSize,
  );
  if (typeof maxSize !== "number") {
    await editor.flashNotification(
      "The setting 'maximumDocumentSize' must be a number",
      "error",
    );
  }
  if (file.content.length > maxSize * 1024 * 1024) {
    editor.flashNotification(
      `Document is too large, maximum is ${maxSize}MiB`,
      "error",
    );
    return;
  }

  const finalFileName = await editor.prompt(
    "File name for pasted document",
    file.name,
  );
  if (!finalFileName) {
    return;
  }

  if (await editor.getCurrentEditor() === "page") {
    const documentPath = resolvePath(
      await editor.getCurrentPage(),
      finalFileName,
    );

    await space.writeDocument(documentPath, file.content);

    const linkStyle = await system.getSpaceConfig(
      "defaultLinkStyle",
      defaultLinkStyle,
    );
    let documentMarkdown = "";
    if (linkStyle === "wikilink") {
      documentMarkdown = `[[${documentPath}]]`;
    } else {
      documentMarkdown = `[${finalFileName}](${encodePageURI(finalFileName)})`;
    }
    if (file.contentType.startsWith("image/")) {
      documentMarkdown = "!" + documentMarkdown;
    }
    editor.insertAtCursor(documentMarkdown);
  } else {
    const documentFolder = (await editor.getCurrentPath())
      .split("/")
      .slice(0, -1)
      .join("/");

    await space.writeDocument(documentFolder + finalFileName, file.content);
  }
}

export async function uploadFile(_ctx: any, accept?: string, capture?: string) {
  const uploadFile = await editor.uploadFile(accept, capture);
  await saveFile(uploadFile);
}
