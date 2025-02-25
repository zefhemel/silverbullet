import type { AppCommand } from "../lib/command.ts";
import type { FilterOption, Notification, PanelMode } from "../type/client.ts";
import { type Config, defaultConfig } from "../type/config.ts";
import type {
  DocumentMeta,
  PageMeta,
} from "@silverbulletmd/silverbullet/types";

export type PanelConfig = {
  mode?: PanelMode;
  html?: string;
  script?: string;
};

export type AppViewState = {
  current?:
    | {
      kind: "page";
      meta: PageMeta;
      path: string;
    }
    | {
      kind: "document";
      meta: DocumentMeta;
      path: string;
    };

  allPages: PageMeta[];
  allDocuments: DocumentMeta[];

  isLoading: boolean;
  isMobile: boolean;
  showPageNavigator: boolean;
  showCommandPalette: boolean;
  showCommandPaletteContext?: string;
  unsavedChanges: boolean;
  syncFailures: number; // Reset everytime a sync succeeds
  progressPerc?: number;
  panels: { [key: string]: PanelConfig };
  commands: Map<string, AppCommand>;
  notifications: Notification[];
  recentCommands: Map<string, Date>;

  config: Config;

  uiOptions: {
    vimMode: boolean;
    darkMode: boolean;
    forcedROMode: boolean;
    customStyles?: string;
  };

  // Page navigator mode
  pageNavigatorMode: "page" | "meta" | "document" | "all";

  // Filter box
  showFilterBox: boolean;
  filterBoxLabel: string;
  filterBoxPlaceHolder: string;
  filterBoxOptions: FilterOption[];
  filterBoxHelpText: string;
  filterBoxOnSelect: (option: FilterOption | undefined) => void;

  // Prompt
  showPrompt: boolean;
  promptMessage?: string;
  promptDefaultValue?: string;
  promptCallback?: (value: string | undefined) => void;

  // Confirm
  showConfirm: boolean;
  confirmMessage?: string;
  confirmCallback?: (value: boolean) => void;
};

export const initialViewState: AppViewState = {
  isLoading: false,
  showPageNavigator: false,
  showCommandPalette: false,
  pageNavigatorMode: "page",
  unsavedChanges: false,
  syncFailures: 0,
  uiOptions: {
    vimMode: false,
    darkMode: false,
    forcedROMode: false,
  },
  isMobile: false,
  panels: {
    lhs: {},
    rhs: {},
    bhs: {},
    modal: {},
  },
  config: defaultConfig,
  allPages: [],
  allDocuments: [],
  commands: new Map(),
  recentCommands: new Map(),
  notifications: [],
  showFilterBox: false,
  filterBoxHelpText: "",
  filterBoxLabel: "",
  filterBoxOnSelect: () => {},
  filterBoxOptions: [],
  filterBoxPlaceHolder: "",

  showPrompt: false,
  showConfirm: false,
};

export type Action =
  | { type: "page-loaded"; meta: PageMeta }
  | { type: "page-loading"; name: string }
  | { type: "page-changed" }
  | { type: "page-saved" }
  | { type: "document-editor-loaded"; meta: DocumentMeta }
  | { type: "document-editor-loading"; name: string }
  | { type: "document-editor-changed" }
  | { type: "document-editor-saved" }
  | { type: "sync-change"; syncSuccess: boolean }
  | { type: "update-current-page-meta"; meta: PageMeta }
  | { type: "update-page-list"; allPages: PageMeta[] }
  | { type: "update-document-list"; allDocuments: DocumentMeta[] }
  | { type: "config-loaded"; config: Config }
  | { type: "start-navigate"; mode: "page" | "meta" | "document" | "all" }
  | { type: "stop-navigate" }
  | {
    type: "update-commands";
    commands: Map<string, AppCommand>;
  }
  | { type: "show-palette"; context?: string }
  | { type: "hide-palette" }
  | { type: "show-notification"; notification: Notification }
  | { type: "dismiss-notification"; id: number }
  | {
    type: "show-panel";
    id: "rhs" | "lhs" | "bhs" | "modal";
    config: PanelConfig;
  }
  | { type: "hide-panel"; id: string }
  | { type: "command-run"; command: string }
  | {
    type: "show-filterbox";
    options: FilterOption[];
    placeHolder: string;
    helpText: string;
    label: string;
    onSelect: (option: FilterOption | undefined) => void;
  }
  | { type: "hide-filterbox" }
  | {
    type: "show-prompt";
    message: string;
    defaultValue: string;
    callback: (value: string | undefined) => void;
  }
  | { type: "hide-prompt" }
  | {
    type: "show-confirm";
    message: string;
    callback: (value: boolean) => void;
  }
  | { type: "hide-confirm" }
  | { type: "set-ui-option"; key: string; value: any }
  | { type: "set-progress"; progressPerc?: number };
