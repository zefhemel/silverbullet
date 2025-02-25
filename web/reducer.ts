import type { PageMeta } from "../plug-api/types.ts";
import type { Action, AppViewState } from "./type.ts";

export default function reducer(
  state: AppViewState,
  action: Action,
): AppViewState {
  // console.log("Got action", action);
  switch (action.type) {
    case "document-editor-loading":
      return {
        ...state,
        isLoading: false,
        current: {
          kind: "document",
          path: action.name,
          // Do a best effort job of filling in the meta data, as the page is not loaded yet
          meta: {
            ref: action.name,
            tag: "document",
            name: action.name,
            contentType: "",
            created: "",
            lastModified: "",
            size: 0,
            perm: "rw",
            extension: "",
          },
        },
      };
    case "document-editor-loaded":
      return {
        ...state,
        isLoading: false,
        current: {
          kind: "document",
          path: action.meta.name,
          meta: action.meta,
        },
      };
    case "page-loading":
      return {
        ...state,
        isLoading: true,
        current: {
          kind: "page",
          path: action.name,
          // Do a best effort job of filling in the meta data
          meta: {
            ref: action.name,
            tag: "page",
            name: action.name,
            lastModified: "",
            created: "",
            perm: "rw",
          },
        },
        panels: state.current?.path === action.name ? state.panels : {
          ...state.panels,
          // Hide these by default to avoid flickering
          top: {},
          bottom: {},
        },
      };
    case "page-loaded": {
      const mouseDetected = globalThis.matchMedia("(pointer:fine)").matches;
      return {
        ...state,
        isLoading: false,
        isMobile: !mouseDetected,
        allPages: state.allPages.map((pageMeta) =>
          pageMeta.name === action.meta.name
            ? { ...pageMeta, lastOpened: Date.now() }
            : pageMeta
        ),
        current: {
          kind: "page",
          path: action.meta.name,
          meta: action.meta as PageMeta,
        },
      };
    }
    case "document-editor-changed":
    case "page-changed":
      return {
        ...state,
        unsavedChanges: true,
      };
    case "document-editor-saved":
    case "page-saved": {
      return {
        ...state,
        unsavedChanges: false,
      };
    }
    case "update-current-page-meta": {
      // Update in the allPages list as well
      state.allPages = state.allPages.map((pageMeta) =>
        pageMeta.name === action.meta.name ? action.meta : pageMeta
      );
      // Can't update page meta if not on a page
      if (state.current?.kind !== "page") return state;
      return {
        ...state,
        current: {
          ...state.current,
          meta: action.meta,
        },
      };
    }
    case "sync-change":
      return {
        ...state,
        syncFailures: action.syncSuccess ? 0 : state.syncFailures + 1,
      };
    case "config-loaded":
      return {
        ...state,
        config: action.config,
      };
    case "update-page-list": {
      // Let's move over any "lastOpened" times to the "allPages" list
      const oldPageMeta = new Map(
        [...state.allPages].map((pm) => [pm.name, pm]),
      );
      let currPageMeta: PageMeta | undefined;
      for (const pageMeta of action.allPages) {
        const oldPageMetaItem = oldPageMeta.get(pageMeta.name);
        if (oldPageMetaItem && oldPageMetaItem.lastOpened) {
          pageMeta.lastOpened = oldPageMetaItem.lastOpened;
        }
        if (pageMeta.name === state.current?.path) {
          currPageMeta = pageMeta;
        }
      }
      const newState = {
        ...state,
        allPages: action.allPages,
      };
      if (currPageMeta) {
        newState.current!.meta = currPageMeta;
      }
      return newState;
    }
    case "update-document-list": {
      return {
        ...state,
        allDocuments: action.allDocuments,
      };
    }
    case "start-navigate": {
      return {
        ...state,
        showPageNavigator: true,
        pageNavigatorMode: action.mode,
        showCommandPalette: false,
        showFilterBox: false,
      };
    }
    case "stop-navigate":
      return {
        ...state,
        showPageNavigator: false,
      };

    case "show-palette": {
      return {
        ...state,
        showCommandPalette: true,
        showPageNavigator: false,
        showFilterBox: false,
        showCommandPaletteContext: action.context,
      };
    }
    case "hide-palette":
      return {
        ...state,
        showCommandPalette: false,
        showCommandPaletteContext: undefined,
      };
    case "command-run":
      return {
        ...state,
        recentCommands: state.recentCommands.set(action.command, new Date()),
      };
    case "update-commands":
      return {
        ...state,
        commands: action.commands,
      };
    case "show-notification":
      return {
        ...state,
        notifications: [...state.notifications, action.notification],
      };
    case "dismiss-notification":
      return {
        ...state,
        notifications: state.notifications.filter((n) => n.id !== action.id),
      };
    case "show-panel":
      return {
        ...state,
        panels: {
          ...state.panels,
          [action.id]: action.config,
        },
      };
    case "hide-panel":
      return {
        ...state,
        panels: {
          ...state.panels,
          [action.id]: {},
        },
      };

    case "show-filterbox":
      return {
        ...state,
        showFilterBox: true,
        filterBoxOnSelect: action.onSelect,
        filterBoxPlaceHolder: action.placeHolder,
        filterBoxOptions: action.options,
        filterBoxLabel: action.label,
        filterBoxHelpText: action.helpText,
      };
    case "hide-filterbox":
      return {
        ...state,
        showCommandPalette: false,
        showPageNavigator: false,
        showFilterBox: false,
        filterBoxOnSelect: () => {},
        filterBoxPlaceHolder: "",
        filterBoxOptions: [],
        filterBoxHelpText: "",
      };
    case "show-prompt":
      return {
        ...state,
        showPrompt: true,
        promptDefaultValue: action.defaultValue,
        promptMessage: action.message,
        promptCallback: action.callback,
      };
    case "hide-prompt":
      return {
        ...state,
        showPrompt: false,
        promptDefaultValue: undefined,
        promptMessage: undefined,
        promptCallback: undefined,
      };
    case "show-confirm":
      return {
        ...state,
        showConfirm: true,
        confirmMessage: action.message,
        confirmCallback: action.callback,
      };
    case "hide-confirm":
      return {
        ...state,
        showConfirm: false,
        confirmMessage: undefined,
        confirmCallback: undefined,
      };
    case "set-ui-option":
      return {
        ...state,
        uiOptions: {
          ...state.uiOptions,
          [action.key]: action.value,
        },
      };
    case "set-progress":
      return {
        ...state,
        progressPerc: action.progressPerc,
      };
  }
}
