import type { PageMeta, UploadFile } from "../types.ts";
import { syscall } from "../syscall.ts";
import type { LocationRef } from "../lib/page_ref.ts";
import type { FilterOption } from "@silverbulletmd/silverbullet/type/client";

/**
 * Exposes various editor utilities.
 * Important: These syscalls are only available in the client.
 * @module
 */

/**
 * Returns the name of the page currently open in the editor.
 * @returns the current page name
 */
export function getCurrentPage(): Promise<string> {
  return syscall("editor.getCurrentPage");
}

/**
 * Returns the meta data of the page currently open in the editor.
 * @returns the current page meta data
 */
export function getCurrentPageMeta(): Promise<PageMeta | undefined> {
  return syscall("editor.getCurrentPageMeta");
}

/**
 * Returns the name of the page or document currently open in the editor.
 * @param extension If true returns page paths with the their `.md` extension
 * @returns the current page path
 */
export function getCurrentPath(extension: boolean = false): Promise<string> {
  return syscall("editor.getCurrentPath", extension);
}

/**
 * Returns the name of the currently open editor.
 * @returns the name of the current editor
 */
export function getCurrentEditor(): Promise<string> {
  return syscall("editor.getCurrentEditor");
}

/**
 * Returns the full text of the currently open page
 */
export function getText(): Promise<string> {
  return syscall("editor.getText");
}

/**
 * This updates the editor text, but in a minimal-diff way:
 * it compares the current editor text with the new text, and only sends the changes to the editor, thereby preserving cursor location
 */
export function setText(
  newText: string,
  isolateHistory = false,
): Promise<void> {
  return syscall("editor.setText", newText, isolateHistory);
}

/**
 * Returns the position (in # of characters from the beginning of the file) of the cursor in the editor
 */
export function getCursor(): Promise<number> {
  return syscall("editor.getCursor");
}

/**
 * Returns the line number and column number of the cursor in the editor
 */
export function getSelection(): Promise<{ from: number; to: number }> {
  return syscall("editor.getSelection");
}

/**
 * Sets the position of the cursor in the editor
 * @param from the start position of the selection
 * @param to the end position of the selection
 */
export function setSelection(from: number, to: number): Promise<void> {
  return syscall("editor.setSelection", from, to);
}

/**
 * Forces a save of the current page
 */
export function save(): Promise<void> {
  return syscall("editor.save");
}

/**
 * Navigates to the specified page reference
 * @param pageRef the page reference to navigate to
 * @param replaceState whether to replace the current history state in the browser history
 * @param newWindow whether to open the page in a new window
 */
export function navigate(
  locationRef: LocationRef,
  replaceState = false,
  newWindow = false,
): Promise<void> {
  return syscall("editor.navigate", locationRef, replaceState, newWindow);
}

/**
 * Opens the page navigator
 * @param mode the mode to open the navigator in
 */
export function openPageNavigator(
  mode: "page" | "meta" | "document" | "all" = "page",
): Promise<void> {
  return syscall("editor.openPageNavigator", mode);
}

/**
 * Opens the command palette
 */
export function openCommandPalette(): Promise<void> {
  return syscall("editor.openCommandPalette");
}

/**
 * Force reloads the current page
 */
export function reloadPage(): Promise<void> {
  return syscall("editor.reloadPage");
}

/**
 * Force reloads the browser UI
 */
export function reloadUI(): Promise<void> {
  return syscall("editor.reloadUI");
}

/**
 * Rebuilds the editor state to ensure the dispatch updates the state.
 */
export function rebuildEditorState(): Promise<void> {
  return syscall("editor.rebuildEditorState");
}

/**
 * Reloads the config and commands, also in the server
 */
export function reloadConfigAndCommands(): Promise<void> {
  return syscall("editor.reloadConfigAndCommands");
}

/**
 * Opens the specified URL in the browser
 * @param url the URL to open
 * @param existingWindow whether to open the URL in an existing window
 */
export function openUrl(url: string, existingWindow = false): Promise<void> {
  return syscall("editor.openUrl", url, existingWindow);
}

export function newWindow(): Promise<void> {
  return syscall("editor.newWindow");
}

/**
 * This is calling the `go()` method from the History Web API.
 * @param delta Position in history to move to relative to the current page,
 * where a negative value moves backwards, and positive forwards
 */
export function goHistory(delta: number): Promise<void> {
  return syscall("editor.goHistory", delta);
}

/**
 * Force the client to download the file in dataUrl with filename as file name
 * @param filename the name of the file to download
 * @param dataUrl the dataUrl of the file to download
 */
export function downloadFile(filename: string, dataUrl: string): Promise<void> {
  return syscall("editor.downloadFile", filename, dataUrl);
}

/**
 * Triggers the browser's native file upload dialog/popup
 * @param accept the file types to accept
 * @param capture the capture mode for the file input
 */
export function uploadFile(
  accept?: string,
  capture?: string,
): Promise<UploadFile> {
  return syscall("editor.uploadFile", accept, capture);
}

/**
 * Shows a flash notification to the user (top right corner)
 * @param message the message to show
 * @param type the type of notification to show
 */
export function flashNotification(
  message: string,
  type: "info" | "error" = "info",
): Promise<void> {
  return syscall("editor.flashNotification", message, type);
}

/**
 * Exposes a filter box UI (similar to the page navigator and command palette)
 * @param label the label to show left of the input box
 * @param options the options to show and to filter on
 * @param helpText the help text to show below the input box
 * @param placeHolder the placeholder text to show in the input box
 */
export function filterBox(
  label: string,
  options: FilterOption[],
  helpText = "",
  placeHolder = "",
): Promise<FilterOption | undefined> {
  return syscall("editor.filterBox", label, options, helpText, placeHolder);
}

/**
 * Shows a panel in the editor
 * @param id the location of the panel to show
 * @param mode the mode or "size" of the panel
 * @param html the html content of the panel
 * @param script the script content of the panel
 */
export function showPanel(
  id: "lhs" | "rhs" | "bhs" | "modal",
  mode: number,
  html: string,
  script = "",
): Promise<void> {
  return syscall("editor.showPanel", id, mode, html, script);
}

/**
 * Hides a panel in the editor
 * @param id the location of the panel to hide
 */
export function hidePanel(
  id: "lhs" | "rhs" | "bhs" | "modal",
): Promise<void> {
  return syscall("editor.hidePanel", id);
}

/**
 * Insert text at the specified position into the editor
 * @param text the text to insert
 * @param pos
 */
export function insertAtPos(text: string, pos: number): Promise<void> {
  return syscall("editor.insertAtPos", text, pos);
}

/**
 * Replace the text in the specified range in the editor
 * @param from the start position of the range
 * @param to the end position of the range
 * @param text the text to replace with
 */
export function replaceRange(
  from: number,
  to: number,
  text: string,
): Promise<void> {
  return syscall("editor.replaceRange", from, to, text);
}

/**
 * Move the cursor to the specified position in the editor
 * @param pos the position to move the cursor to
 * @param center whether to center the cursor in the editor after moving
 */
export function moveCursor(pos: number, center = false): Promise<void> {
  return syscall("editor.moveCursor", pos, center);
}

/**
 * Move the cursor to the specified line and column in the editor
 * @param line the line number to move the cursor to
 * @param column the column number to move the cursor to
 * @param center whether to center the cursor in the editor after moving
 */
export function moveCursorToLine(
  line: number,
  column = 1,
  center = false,
): Promise<void> {
  return syscall("editor.moveCursorToLine", line, column, center);
}

/**
 * Insert text at the cursor position in the editor
 * @param text the text to insert
 */
export function insertAtCursor(
  text: string,
  scrollIntoView = false,
): Promise<void> {
  return syscall("editor.insertAtCursor", text, scrollIntoView);
}

/**
 * Dispatch a CodeMirror transaction: https://codemirror.net/docs/ref/#state.Transaction
 */
export function dispatch(change: any): Promise<void> {
  return syscall("editor.dispatch", change);
}

/**
 * Prompt the user for text input
 * @param message the message to show in the prompt
 * @param defaultValue a default value pre-filled in the prompt
 * @returns
 */
export function prompt(
  message: string,
  defaultValue = "",
): Promise<string | undefined> {
  return syscall("editor.prompt", message, defaultValue);
}

/**
 * Prompt the user for confirmation
 * @param message the message to show in the confirmation dialog
 * @returns
 */
export function confirm(
  message: string,
): Promise<boolean> {
  return syscall("editor.confirm", message);
}

/**
 * Get the value of a UI option
 * @param key the key of the UI option to get
 * @returns
 */
export function getUiOption(key: string): Promise<any> {
  return syscall("editor.getUiOption", key);
}

/**
 * Set the value of a UI option
 * @param key the key of the UI option to set
 * @param value the value to set the UI option to
 */
export function setUiOption(key: string, value: any): Promise<void> {
  return syscall("editor.setUiOption", key, value);
}

/**
 * Perform a fold at the current cursor position
 */
export function fold(): Promise<void> {
  return syscall("editor.fold");
}

/**
 * Perform an unfold at the current cursor position
 */
export function unfold(): Promise<void> {
  return syscall("editor.unfold");
}

/**
 * Toggle the fold at the current cursor position
 */
export function toggleFold(): Promise<void> {
  return syscall("editor.toggleFold");
}

/**
 * Fold all code blocks in the editor
 */
export function foldAll(): Promise<void> {
  return syscall("editor.foldAll");
}

/**
 * Unfold all code blocks in the editor
 */
export function unfoldAll(): Promise<void> {
  return syscall("editor.unfoldAll");
}

/**
 * Perform an undo operation of the last edit in the editor
 */
export function undo(): Promise<void> {
  return syscall("editor.undo");
}

/**
 * Perform a redo operation of the last undo in the editor
 */
export function redo(): Promise<void> {
  return syscall("editor.redo");
}

/**
 * Open the editor's native search panel
 */
export function openSearchPanel(): Promise<void> {
  return syscall("editor.openSearchPanel");
}

/**
 * Copy the specified data to the clipboard
 * @param data the data to copy
 */
export function copyToClipboard(data: string | Blob): Promise<void> {
  return syscall("editor.copyToClipboard", data);
}

/**
 * Delete the current line in the editor
 */
export function deleteLine(): Promise<void> {
  return syscall("editor.deleteLine");
}

export function moveLineUp(): Promise<void> {
  return syscall("editor.moveLineUp");
}

export function moveLineDown(): Promise<void> {
  return syscall("editor.moveLineDown");
}

// Vim-mode specific syscalls

/**
 * Execute a Vim ex command
 * @param exCommand the ex command to execute
 */
export function vimEx(exCommand: string): Promise<any> {
  return syscall("editor.vimEx", exCommand);
}
