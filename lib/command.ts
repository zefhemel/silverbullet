import type { SlashCommandDef } from "$lib/manifest.ts";

export type CommandDef = {
  name: string;

  contexts?: string[];

  // Default 0, higher is higher priority = higher in the list
  priority?: number;

  // Bind to keyboard shortcut
  key?: string;
  mac?: string;

  hide?: boolean;
  requireMode?: "rw" | "ro";
  requireEditor?: "any" | "page" | "notpage" | string;
};

export type AppCommand = {
  command: CommandDef;
  run: (args?: any[]) => Promise<void>;
};

export type SlashCommand = {
  slashCommand: SlashCommandDef;
  run: (args?: any[]) => Promise<void>;
};

export type CommandHookEvents = {
  commandsUpdated(commandMap: Map<string, AppCommand>): void;
};

export function isValidEditor(
  currentEditor: string | undefined,
  requiredEditor: string | undefined,
): boolean {
  return (requiredEditor === undefined) ||
    (currentEditor === undefined &&
      requiredEditor === "page") ||
    (requiredEditor === "any") ||
    (currentEditor === requiredEditor) ||
    (currentEditor !== undefined && requiredEditor === "notpage");
}
