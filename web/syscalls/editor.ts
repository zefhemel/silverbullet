import type { Client } from "../client.ts";
import {
  foldAll,
  foldCode,
  toggleFold,
  unfoldAll,
  unfoldCode,
} from "@codemirror/language";
import {
  deleteLine,
  moveLineDown,
  moveLineUp,
  redo,
  undo,
} from "@codemirror/commands";
import type { Transaction } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { getCM as vimGetCm, Vim } from "@replit/codemirror-vim";
import type { SysCallMapping } from "$lib/plugos/system.ts";
import type { FilterOption } from "@silverbulletmd/silverbullet/type/client";
import type { PageMeta, UploadFile } from "../../plug-api/types.ts";
import type { PageRef } from "@silverbulletmd/silverbullet/lib/page_ref";
import { openSearchPanel } from "@codemirror/search";

export function editorSyscalls(client: Client): SysCallMapping {
  const syscalls: SysCallMapping = {
    "editor.getCurrentPage": (): string => {
      return client.currentPage;
    },
    "editor.getCurrentPageMeta": (): PageMeta | undefined => {
      return client.ui.viewState.currentPageMeta;
    },
    "editor.getText": () => {
      return client.editorView.state.sliceDoc();
    },
    "editor.setText": (_ctx, newText: string, shouldIsolateHistory = false) => {
      client.setEditorText(newText, shouldIsolateHistory);
    },
    "editor.getCursor": (): number => {
      return client.editorView.state.selection.main.from;
    },
    "editor.getSelection": (): { from: number; to: number } => {
      return client.editorView.state.selection.main;
    },
    "editor.save": () => {
      return client.save(true);
    },
    "editor.navigate": async (
      _ctx,
      pageRef: PageRef | string,
      replaceState = false,
      newWindow = false,
    ) => {
      if (typeof pageRef === "string") {
        pageRef = { page: pageRef };
      }
      await client.navigate(pageRef, replaceState, newWindow);
    },
    "editor.reloadPage": async () => {
      await client.reloadPage();
    },
    "editor.reloadUI": () => {
      location.reload();
    },
    "editor.rebuildEditorState": () => {
      client.rebuildEditorState();
    },
    "editor.reloadConfigAndCommands": async () => {
      await client.loadConfig();

      await client.clientSystem.system.localSyscall(
        "system.loadSpaceScripts",
        [],
      );
      await client.clientSystem.system.localSyscall(
        "system.loadSpaceStyles",
        [],
      );
    },
    "editor.openUrl": (_ctx, url: string, existingWindow = false) => {
      if (!existingWindow) {
        const win = globalThis.open(url, "_blank");
        if (win) {
          win.focus();
        }
      } else {
        location.href = url;
      }
    },
    "editor.newWindow": () => {
      globalThis.open(
        location.href,
        "rnd" + Math.random(),
        `width=${globalThis.innerWidth},heigh=${globalThis.innerHeight}`,
      );
    },
    "editor.goHistory": (_ctx, delta: number) => {
      globalThis.history.go(delta);
    },
    "editor.downloadFile": (_ctx, filename: string, dataUrl: string) => {
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = filename;
      link.click();
    },
    "editor.uploadFile": (
      _ctx,
      accept?: string,
      capture?: string,
    ): Promise<UploadFile> => {
      return new Promise<UploadFile>((resolve, reject) => {
        const input = document.createElement("input");
        input.type = "file";
        if (accept) {
          input.accept = accept;
        }
        if (capture) {
          input.capture = capture;
        }

        input.onchange = () => {
          const file = input.files?.item(0);
          if (!file) {
            reject(new Error("No file found"));
          } else {
            const reader = new FileReader();
            reader.readAsArrayBuffer(file);
            reader.onloadend = async (evt) => {
              if (evt.target?.readyState == FileReader.DONE) {
                resolve({
                  name: file.name,
                  contentType: file.type,
                  content: new Uint8Array(await file.arrayBuffer()),
                });
              }
            };
            reader.onabort = (e) => {
              reject(e);
            };
            reader.onerror = (e) => {
              reject(e);
            };
          }
        };
        input.onabort = (e) => {
          reject(e);
        };

        input.click();
      });
    },
    "editor.flashNotification": (
      _ctx,
      message: string,
      type: "error" | "info" = "info",
    ) => {
      client.flashNotification(message, type);
    },
    "editor.filterBox": (
      _ctx,
      label: string,
      options: FilterOption[],
      helpText = "",
      placeHolder = "",
    ): Promise<FilterOption | undefined> => {
      return client.filterBox(label, options, helpText, placeHolder);
    },
    "editor.showPanel": (
      _ctx,
      id: string,
      mode: number,
      html: string,
      script: string,
    ) => {
      client.ui.viewDispatch({
        type: "show-panel",
        id: id as any,
        config: { html, script, mode },
      });
      setTimeout(() => {
        // Dummy dispatch to rerender the editor and toggle the panel
        client.editorView.dispatch({});
      });
    },
    "editor.hidePanel": (_ctx, id: string) => {
      client.ui.viewDispatch({
        type: "hide-panel",
        id: id as any,
      });
      setTimeout(() => {
        // Dummy dispatch to rerender the editor and toggle the panel
        client.editorView.dispatch({});
      });
    },
    "editor.insertAtPos": (_ctx, text: string, pos: number) => {
      client.editorView.dispatch({
        changes: {
          insert: text,
          from: pos,
        },
      });
    },
    "editor.replaceRange": (_ctx, from: number, to: number, text: string) => {
      client.editorView.dispatch({
        changes: {
          insert: text,
          from: from,
          to: to,
        },
      });
    },
    "editor.moveCursor": (_ctx, pos: number, center = false) => {
      client.editorView.dispatch({
        selection: {
          anchor: pos,
        },
      });
      if (center) {
        client.editorView.dispatch({
          effects: [
            EditorView.scrollIntoView(
              pos,
              {
                y: "center",
              },
            ),
          ],
        });
      }
      client.editorView.focus();
    },
    "editor.moveCursorToLine": (
      _ctx,
      line: number,
      column = 1,
      center = false,
    ) => {
      // CodeMirror already keeps information about lines
      const cmLine = client.editorView.state.doc.line(line);
      // How much to move inside the line, column number starts from 1
      const offset = Math.max(0, Math.min(cmLine.length, column - 1));
      // Just reuse the implementation above
      syscalls["editor.moveCursor"](_ctx, cmLine.from + offset, center);
    },
    "editor.setSelection": (_ctx, from: number, to: number) => {
      client.editorView.dispatch({
        selection: {
          anchor: from,
          head: to,
        },
      });
    },

    "editor.insertAtCursor": (_ctx, text: string, scrollIntoView = false) => {
      const editorView = client.editorView;
      const from = editorView.state.selection.main.from;
      editorView.dispatch({
        changes: {
          insert: text,
          from: from,
        },
        selection: {
          anchor: from + text.length,
        },
        scrollIntoView,
      });
    },
    "editor.dispatch": (_ctx, change: Transaction) => {
      client.editorView.dispatch(change);
    },
    "editor.prompt": (
      _ctx,
      message: string,
      defaultValue = "",
    ): Promise<string | undefined> => {
      return client.prompt(message, defaultValue);
    },
    "editor.confirm": (_ctx, message: string): Promise<boolean> => {
      return client.confirm(message);
    },
    "editor.getUiOption": (_ctx, key: string): any => {
      return (client.ui.viewState.uiOptions as any)[key];
    },
    "editor.setUiOption": (_ctx, key: string, value: any) => {
      client.ui.viewDispatch({
        type: "set-ui-option",
        key,
        value,
      });
      client.reloadPage();
    },
    "editor.vimEx": (_ctx, exCommand: string) => {
      const cm = vimGetCm(client.editorView)!;
      return Vim.handleEx(cm, exCommand);
    },
    "editor.openPageNavigator": (
      _ctx,
      mode: "page" | "meta" | "all" = "page",
    ) => {
      client.startPageNavigate(mode);
    },
    "editor.openCommandPalette": () => {
      client.ui.viewDispatch({
        type: "show-palette",
        context: client.getContext(),
      });
    },
    "editor.deleteLine": () => {
      deleteLine(client.editorView);
    },
    "editor.moveLineUp": () => {
      return moveLineUp({
        state: client.editorView.state,
        dispatch: client.editorView.dispatch,
      });
    },
    "editor.moveLineDown": () => {
      return moveLineDown({
        state: client.editorView.state,
        dispatch: client.editorView.dispatch,
      });
    },
    // Folding
    "editor.fold": () => {
      foldCode(client.editorView);
    },
    "editor.unfold": () => {
      unfoldCode(client.editorView);
    },
    "editor.toggleFold": () => {
      toggleFold(client.editorView);
    },
    "editor.foldAll": () => {
      foldAll(client.editorView);
    },
    "editor.unfoldAll": () => {
      unfoldAll(client.editorView);
    },
    "editor.undo": () => {
      return undo(client.editorView);
    },
    "editor.redo": () => {
      return redo(client.editorView);
    },
    "editor.openSearchPanel": () => {
      openSearchPanel(client.editorView);
    },
    "editor.copyToClipboard": (_ctx, data: string | Blob) => {
      if (typeof data === "string") {
        navigator.clipboard.writeText(data);
      } else {
        navigator.clipboard.write([new ClipboardItem({ [data.type]: data })]);
      }
    },
  };

  return syscalls;
}
