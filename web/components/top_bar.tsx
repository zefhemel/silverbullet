import type {
  CompletionContext,
  CompletionResult,
} from "@codemirror/autocomplete";
import type { ComponentChildren, FunctionalComponent } from "preact";
import type { Notification } from "@silverbulletmd/silverbullet/type/client";
import type { FeatherProps } from "preact-feather/types";
import type { IconBaseProps } from "react-icons/types";
import { MiniEditor } from "./mini_editor.tsx";

export type ActionButton = {
  icon: FunctionalComponent<FeatherProps | IconBaseProps>;
  description: string;
  class?: string;
  callback: () => void;
  href?: string;
  mobile?: boolean;
};

export function TopBar({
  pageName,
  unsavedChanges,
  syncFailures,
  isLoading,
  notifications,
  onRename,
  actionButtons,
  darkMode,
  vimMode,
  progressPerc,
  completer,
  lhs,
  onClick,
  rhs,
  pageNamePrefix,
  cssClass,
}: {
  pageName?: string;
  unsavedChanges: boolean;
  syncFailures: number;
  isLoading: boolean;
  notifications: Notification[];
  darkMode: boolean;
  vimMode: boolean;
  progressPerc?: number;
  onRename: (newName?: string) => Promise<void>;
  onClick: () => void;
  completer: (context: CompletionContext) => Promise<CompletionResult | null>;
  actionButtons: ActionButton[];
  lhs?: ComponentChildren;
  rhs?: ComponentChildren;
  pageNamePrefix?: string;
  cssClass?: string;
}) {
  return (
    <div
      id="sb-top"
      className={syncFailures > 1 ? "sb-sync-error" : undefined}
      onClick={onClick}
    >
      {lhs}
      <div className="main">
        <div className="inner">
          <div className="wrapper">
            <div className="sb-page-prefix">{pageNamePrefix}</div>
            <span
              id="sb-current-page"
              className={(isLoading
                ? "sb-loading"
                : unsavedChanges
                ? "sb-unsaved"
                : "sb-saved") +
                (cssClass ? " sb-decorated-object " + cssClass : "")}
            >
              <MiniEditor
                text={pageName ?? ""}
                vimMode={vimMode}
                darkMode={darkMode}
                onBlur={(newName) => {
                  if (newName !== pageName) {
                    return onRename(newName);
                  } else {
                    return onRename();
                  }
                }}
                completer={completer}
                onEnter={(newName) => {
                  onRename(newName);
                }}
              />
            </span>
            {notifications.length > 0 && (
              <div className="sb-notifications">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`sb-notification-${notification.type}`}
                  >
                    {notification.message}
                  </div>
                ))}
              </div>
            )}
            <div className="sb-actions">
              {progressPerc !== undefined &&
                (
                  <div
                    className="progress-wrapper"
                    title={`Sync Progress: ${progressPerc}%`}
                  >
                    <div
                      className="progress-bar"
                      style={`background: radial-gradient(closest-side, var(--top-background-color) 79%, transparent 80% 100%), conic-gradient(var(--button-color) ${progressPerc}%, var(--button-background-color) 0);`}
                    >
                      {progressPerc}
                    </div>
                  </div>
                )}
              {actionButtons.map((actionButton) => {
                const button = (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      actionButton.callback();
                    }}
                    title={actionButton.description}
                    className={actionButton.class}
                  >
                    <actionButton.icon size={18} />
                  </button>
                );

                return actionButton.href
                  ? <a href={actionButton.href}>{button}</a>
                  : button;
              })}
            </div>
          </div>
        </div>
      </div>
      {rhs}
    </div>
  );
}
