import type {
  ActionButton,
  EmojiConfig,
  Shortcut,
  SmartQuotesConfig,
} from "./client.ts";

export interface ConfigContainer {
  config: Config;

  loadConfig(): Promise<void>;
}

export type ObjectDecorator = {
  // The expression to match against the object
  where: string;
  // The dynamic attributes to add to the object
  attributes: DynamicAttributeDefinitionConfig;
};

export interface DynamicAttributeDefinitionConfig {
  // Encodes a QueryExpression as a string
  [key: string]: string | DynamicAttributeDefinitionConfig;
}

export type LibraryDef = {
  /**
   * @deprecated Use `import` instead
   */
  source?: string;
  import: string;
  exclude?: string[];
};

export type Config = {
  indexPage: string;
  shortcuts?: Shortcut[];
  // DEPRECATED: Use smartQuotes instead
  useSmartQuotes?: boolean;
  maximumDocumentSize?: number;
  libraries?: LibraryDef[];
  // Open the last page that was open when the app was closed
  pwaOpenLastPage?: boolean;
  // UI visuals
  hideEditButton?: boolean;
  hideSyncButton?: boolean;
  actionButtons: ActionButton[];
  objectDecorators?: ObjectDecorator[];
  // Format: compatible with docker ignore
  spaceIgnore?: string;
  emoji?: EmojiConfig;
  autoCloseBrackets: string;
  smartQuotes?: SmartQuotesConfig;
  indentMultiplier?: number;

  schema: SchemaConfig;

  // DEPRECATED: Use space styles instead
  customStyles?: string | string[];

  // NOTE: Bit niche, maybe delete at some point?
  defaultLinkStyle?: string;
} & Record<string, any>;

type SchemaConfig = {
  tag: Record<string, any>; // any = JSONSchema
  config: Record<string, any>; // any = JSONSchema
};

export const defaultConfig: Config = {
  indexPage: "index",
  hideSyncButton: false,
  maximumDocumentSize: 10, // MiB
  defaultLinkStyle: "wikilink", // wikilink [[]] or markdown []()
  actionButtons: [], // Actually defaults to defaultActionButtons
  autoCloseBrackets: "([{`",
  indentMultiplier: 1,

  schema: {
    config: {
      type: "object",
      properties: {},
      additionalProperties: true,
    },
    tag: {},
  },
};

export const defaultActionButtons: ActionButton[] = [
  {
    icon: "Home",
    description: "Go to the index page",
    command: "Navigate: Home",
  },
  {
    icon: "Book",
    description: `Open page`,
    command: "Navigate: Page Picker",
  },
  {
    icon: "Terminal",
    description: `Run command`,
    command: "Open Command Palette",
  },
];
