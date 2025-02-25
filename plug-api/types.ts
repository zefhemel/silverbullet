import type { ParseTree } from "./lib/tree.ts";
import type { TextChange } from "../web/change.ts";

export type FileMeta = {
  name: string;
  created: number;
  lastModified: number;
  contentType: string;
  size: number;
  perm: "ro" | "rw";
  noSync?: boolean;
};

export type PageMeta = ObjectValue<
  {
    name: string;
    created: string; // indexing it as a string
    lastModified: string; // indexing it as a string
    perm: "ro" | "rw";
    lastOpened?: number;
    pageDecoration?: PageDecoration;
  } & Record<string, any>
>;

/**
 * Decorates a page when it matches certain criteria
 */
export type PageDecoration = {
  prefix?: string;
  cssClasses?: string[];
  hide?: boolean;
  renderWidgets?: boolean; // Defaults to true
};

export type DocumentMeta = ObjectValue<
  {
    name: string;
    contentType: string;
    created: string;
    lastModified: string;
    size: number;
    perm: "ro" | "rw";
    extension: string;
  } & Record<string, any>
>;

export type SyscallMeta = {
  name: string;
  requiredPermissions: string[];
  argCount: number;
};

// Message Queue related types
export type MQMessage = {
  id: string;
  queue: string;
  body: any;
  retries?: number;
};

export type MQStats = {
  queued: number;
  processing: number;
  dlq: number;
};

export type MQSubscribeOptions = {
  batchSize?: number;
  pollInterval?: number;
};

// Key-Value Store related types
export type KvKey = string[];

export type KV<T = any> = {
  key: KvKey;
  value: T;
};

export type OrderBy = {
  expr: QueryExpression;
  desc: boolean;
};

export type Select = {
  name: string;
  expr?: QueryExpression;
};

export type Query = {
  querySource?: string;
  filter?: QueryExpression;
  orderBy?: OrderBy[];
  select?: Select[];
  limit?: QueryExpression;
  render?: string;
  renderAll?: boolean;
  distinct?: boolean;
};

export type KvQuery = Omit<Query, "querySource"> & {
  prefix?: KvKey;
};

export type QueryExpression =
  | ["and", QueryExpression, QueryExpression]
  | ["or", QueryExpression, QueryExpression]
  | ["=", QueryExpression, QueryExpression]
  | ["!=", QueryExpression, QueryExpression]
  | ["=~", QueryExpression, QueryExpression]
  | ["!=~", QueryExpression, QueryExpression]
  | ["<", QueryExpression, QueryExpression]
  | ["<=", QueryExpression, QueryExpression]
  | [">", QueryExpression, QueryExpression]
  | [">=", QueryExpression, QueryExpression]
  | ["in", QueryExpression, QueryExpression]
  | ["attr"] // .
  | ["attr", string] // name
  | ["attr", QueryExpression, string] // something.name
  | ["global", string] // @name
  | ["number", number]
  | ["string", string]
  | ["boolean", boolean]
  | ["null"]
  | ["not", QueryExpression]
  | ["array", QueryExpression[]]
  | ["object", [string, QueryExpression][]]
  | ["regexp", string, string] // regex, modifier
  | ["pageref", string]
  | ["-", QueryExpression]
  | ["+", QueryExpression, QueryExpression]
  | ["-", QueryExpression, QueryExpression]
  | ["*", QueryExpression, QueryExpression]
  | ["%", QueryExpression, QueryExpression]
  | ["/", QueryExpression, QueryExpression]
  | ["?", QueryExpression, QueryExpression, QueryExpression]
  | ["query", Query]
  | ["call", string, QueryExpression[]];

export type FunctionMap = Record<
  string,
  (...args: any[]) => any
>;

/**
 * An ObjectValue that can be indexed by the `index` plug, needs to have a minimum of
 * of two fields:
 * - ref: a unique reference (id) for the object, ideally a page reference
 * - tags: a list of tags that the object belongs to
 */
export type ObjectValue<T> = {
  ref: string;
  tag: string; // main tag
  tags?: string[];
  itags?: string[]; // implicit or inherited tags (inherited from the page for instance)
} & T;

export type ObjectQuery = Omit<Query, "prefix">;

// Code widget stuff
export type CodeWidgetCallback = (
  bodyText: string,
  pageName: string,
) => Promise<CodeWidgetContent | null>;

export type CodeWidgetContent = {
  html?: string;
  markdown?: string;
  script?: string;
  buttons?: CodeWidgetButton[];
};

export type CodeWidgetButton = {
  widgetTarget?: boolean;
  description: string;
  svg: string;
  invokeFunction: string[];
};

// Document editors stuff
export type DocumentEditorCallback = () => Promise<DocumentEditorContent>;

export type DocumentEditorContent = {
  html: string;
  script?: string;
};

export type LintDiagnostic = {
  from: number;
  to: number;
  severity: "error" | "warning" | "info" | "hint";
  message: string;
};

export type UploadFile = {
  name: string;
  contentType: string;
  content: Uint8Array;
};

export type AppEvent =
  | "page:click"
  | "editor:complete"
  | "minieditor:complete"
  | "slash:complete"
  | "editor:lint"
  | "page:load"
  | "editor:init"
  | "editor:pageLoaded" // args: pageName, previousPage, isSynced
  | "editor:pageReloaded"
  | "editor:pageSaving"
  | "editor:pageSaved"
  | "editor:documentSaving"
  | "editor:documentSaved"
  | "editor:modeswitch"
  | "plugs:loaded"
  | "editor:pageModified";

export type QueryProviderEvent = {
  query: Query;
  variables?: Record<string, any>;
};

export type ClickEvent = {
  page: string;
  pos: number;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
};

export type IndexEvent = {
  name: string;
  text: string;
};

export type IndexTreeEvent = {
  name: string;
  tree: ParseTree;
};

export type PublishEvent = {
  uri?: string;
  // Page name
  name: string;
};

export type LintEvent = {
  name: string;
  tree: ParseTree;
};

export type CompleteEvent = {
  pageName: string;
  linePrefix: string;
  pos: number;
  parentNodes: string[];
};

export type SlashCompletionOption = {
  label: string;
  detail?: string;
  invoke: string;
  order?: number;
} & Record<string, any>;

export type SlashCompletions = {
  // Ignore this one, only for compatibility with regular completions
  from?: number;
  // The actual completions
  options: SlashCompletionOption[];
};

export type WidgetContent = {
  html?: string;
  script?: string;
  markdown?: string;
  url?: string;
  height?: number;
  width?: number;
};

/** PageModifiedEvent payload for "editor:pageModified". Fired when the document text changes
 */
export type PageModifiedEvent = {
  changes: TextChange[];
};

// HTTP Endpoint related types
export type EndpointRequest = {
  method: string;
  fullPath: string;
  path: string;
  query: { [key: string]: string };
  headers: { [key: string]: string };
  body: any;
};

export type EndpointResponse = {
  status?: number;
  headers?: { [key: string]: string };
  body: any;
};
