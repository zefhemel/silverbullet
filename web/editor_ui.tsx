import { Confirm, Prompt } from "./components/basic_modals.tsx";
import { CommandPalette } from "./components/command_palette.tsx";
import { FilterList } from "./components/filter.tsx";
import { PageNavigator } from "./components/page_navigator.tsx";
import { TopBar } from "./components/top_bar.tsx";
import reducer from "./reducer.ts";
import { type Action, type AppViewState, initialViewState } from "./type.ts";
import * as featherIcons from "preact-feather";
import * as mdi from "./filtered_material_icons.ts";
import { h, render as preactRender } from "preact";
import { useEffect, useReducer } from "preact/hooks";
import { closeSearchPanel } from "@codemirror/search";
import { runScopeHandlers } from "@codemirror/view";
import type { Client } from "./client.ts";
import { Panel } from "./components/panel.tsx";
import { safeRun, sleep } from "../lib/async.ts";
import { parseCommand } from "$common/command.ts";
import { defaultActionButtons } from "@silverbulletmd/silverbullet/type/config";

export class MainUI {
  viewState: AppViewState = initialViewState;
  viewDispatch: (action: Action) => void = () => {};

  constructor(private client: Client) {
    // Make keyboard shortcuts work even when the editor is in read only mode or not focused
    globalThis.addEventListener("keydown", (ev) => {
      if (!client.editorView.hasFocus) {
        const target = ev.target as HTMLElement;
        if (target.className === "cm-textfield" && ev.key === "Escape") {
          // Search panel is open, let's close it
          console.log("Closing search panel");
          closeSearchPanel(client.editorView);
          return;
        } else if (
          target.className === "cm-textfield" ||
          target.closest(".cm-content") || target.closest(".cm-vim-panel")
        ) {
          // In some cm element, let's back out
          return;
        }
        console.log("Delegated keydown", ev, "to editor");
        if (runScopeHandlers(client.editorView, ev, "editor")) {
          ev.preventDefault();
        }
      }
    });

    globalThis.addEventListener("touchstart", (ev) => {
      // Launch the page picker on a two-finger tap
      if (ev.touches.length === 2) {
        ev.stopPropagation();
        ev.preventDefault();
        client.startPageNavigate("page");
      }
      // Launch the command palette using a three-finger tap
      if (ev.touches.length === 3) {
        ev.stopPropagation();
        ev.preventDefault();
        this.viewDispatch({
          type: "show-palette",
          context: client.getContext(),
        });
      }
    });

    globalThis.addEventListener("mouseup", (_) => {
      setTimeout(() => {
        client.editorView.dispatch({});
      });
    });
  }

  ViewComponent() {
    const [viewState, dispatch] = useReducer(reducer, initialViewState);
    this.viewState = viewState;
    this.viewDispatch = dispatch;

    const client = this.client;

    useEffect(() => {
      if (viewState.currentPage) {
        document.title =
          (viewState.currentPageMeta?.pageDecoration?.prefix ?? "") +
          viewState.currentPage;
      }
    }, [viewState.currentPage, viewState.currentPageMeta]);

    useEffect(() => {
      client.tweakEditorDOM(
        client.editorView.contentDOM,
      );
    }, [viewState.uiOptions.forcedROMode]);

    useEffect(() => {
      this.client.rebuildEditorState();
      this.client.dispatchAppEvent("editor:modeswitch");
    }, [viewState.uiOptions.vimMode]);

    useEffect(() => {
      document.documentElement.dataset.theme = viewState.uiOptions.darkMode
        ? "dark"
        : "light";
    }, [viewState.uiOptions.darkMode]);

    useEffect(() => {
      // Need to dispatch a resize event so that the top_bar can pick it up
      globalThis.dispatchEvent(new Event("resize"));
    }, [viewState.panels]);

    return (
      <>
        {viewState.showPageNavigator && (
          <PageNavigator
            allPages={viewState.allPages}
            currentPage={client.currentPage}
            mode={viewState.pageNavigatorMode}
            completer={client.miniEditorComplete.bind(client)}
            vimMode={viewState.uiOptions.vimMode}
            darkMode={viewState.uiOptions.darkMode}
            onModeSwitch={(mode) => {
              dispatch({ type: "stop-navigate" });
              setTimeout(() => {
                dispatch({ type: "start-navigate", mode });
              });
            }}
            onNavigate={(page) => {
              dispatch({ type: "stop-navigate" });
              setTimeout(() => {
                client.focus();
              });
              if (page) {
                safeRun(async () => {
                  await client.navigate({ page });
                });
              }
            }}
          />
        )}
        {viewState.showCommandPalette && (
          <CommandPalette
            onTrigger={(cmd) => {
              dispatch({ type: "hide-palette" });
              if (cmd) {
                dispatch({ type: "command-run", command: cmd.command.name });
                cmd
                  .run()
                  .catch((e: any) => {
                    console.error("Error running command", e.message);
                  })
                  .then((returnValue: any) => {
                    // Always be focusing the editor after running a command
                    if (returnValue !== false) {
                      client.focus();
                    }
                  });
              } else {
                setTimeout(() => client.focus());
              }
            }}
            commands={client.getCommandsByContext(viewState)}
            vimMode={viewState.uiOptions.vimMode}
            darkMode={viewState.uiOptions.darkMode}
            completer={client.miniEditorComplete.bind(client)}
            recentCommands={viewState.recentCommands}
            config={this.client.config}
          />
        )}
        {viewState.showFilterBox && (
          <FilterList
            label={viewState.filterBoxLabel}
            placeholder={viewState.filterBoxPlaceHolder}
            options={viewState.filterBoxOptions}
            vimMode={viewState.uiOptions.vimMode}
            darkMode={viewState.uiOptions.darkMode}
            allowNew={false}
            completer={client.miniEditorComplete.bind(client)}
            helpText={viewState.filterBoxHelpText}
            onSelect={viewState.filterBoxOnSelect}
          />
        )}
        {viewState.showPrompt && (
          <Prompt
            message={viewState.promptMessage!}
            defaultValue={viewState.promptDefaultValue}
            vimMode={viewState.uiOptions.vimMode}
            darkMode={viewState.uiOptions.darkMode}
            completer={client.miniEditorComplete.bind(client)}
            callback={(value) => {
              dispatch({ type: "hide-prompt" });
              viewState.promptCallback!(value);
            }}
          />
        )}
        {viewState.showConfirm && (
          <Confirm
            message={viewState.confirmMessage!}
            callback={(value) => {
              dispatch({ type: "hide-confirm" });
              viewState.confirmCallback!(value);
            }}
          />
        )}
        <TopBar
          pageName={viewState.currentPage}
          notifications={viewState.notifications}
          syncFailures={viewState.syncFailures}
          unsavedChanges={viewState.unsavedChanges}
          isLoading={viewState.isLoading}
          vimMode={viewState.uiOptions.vimMode}
          darkMode={viewState.uiOptions.darkMode}
          progressPerc={viewState.progressPerc}
          completer={client.miniEditorComplete.bind(client)}
          onClick={() => {
            client.editorView.scrollDOM.scrollTop = 0;
          }}
          onRename={async (newName) => {
            if (!newName) {
              // Always move cursor to the start of the page
              client.editorView.dispatch({
                selection: { anchor: 0 },
              });
              client.focus();
              return;
            }
            console.log("Now renaming page to...", newName);
            await client.clientSystem.system.invokeFunction(
              "index.renamePageCommand",
              [{ page: newName }],
            );
            client.focus();
          }}
          actionButtons={[
            // Sync button
            ...(!globalThis.silverBulletConfig.syncOnly &&
                !viewState.config.hideSyncButton)
              // If we support syncOnly, don't show this toggle button
              ? [{
                icon: featherIcons.RefreshCw,
                description: this.client.syncMode
                  ? "Currently in Sync mode, click to switch to Online mode"
                  : "Currently in Online mode, click to switch to Sync mode",
                class: this.client.syncMode ? "sb-enabled" : undefined,
                callback: () => {
                  (async () => {
                    const newValue = !this.client.syncMode;

                    if (newValue) {
                      localStorage.setItem("syncMode", "true");
                      this.client.flashNotification(
                        "Now switching to sync mode, one moment please...",
                      );
                      await sleep(1000);
                      location.reload();
                    } else {
                      localStorage.removeItem("syncMode");
                      this.client.flashNotification(
                        "Now switching to online mode, one moment please...",
                      );
                      await sleep(1000);
                      location.reload();
                    }
                  })().catch(console.error);
                },
              }]
              : [],
            // Edit (reader/writer) button ONLY on mobile
            ...(viewState.isMobile && !viewState.config.hideEditButton)
              ? [{
                icon: featherIcons.Edit3,
                description: viewState.uiOptions.forcedROMode
                  ? "Currently in reader mode, click to switch to writer mode"
                  : "Currently in writer mode, click to switch to reader mode",
                class: !viewState.uiOptions.forcedROMode
                  ? "sb-enabled"
                  : undefined,
                callback: () => {
                  dispatch({
                    type: "set-ui-option",
                    key: "forcedROMode",
                    value: !viewState.uiOptions.forcedROMode,
                  });
                  // After a tick (to have the dispatch update the state), rebuild the editor
                  setTimeout(() => {
                    client.rebuildEditorState();
                  });
                },
              }]
              : [],
            // Custom action buttons
            ...(viewState.config.actionButtons.length > 0
              ? viewState.config.actionButtons
              : defaultActionButtons)
              .filter((button) =>
                (typeof button.mobile === "undefined") ||
                (button.mobile === viewState.isMobile)
              )
              .map((button) => {
                const parsedCommand = parseCommand(button.command);
                const mdiIcon = (mdi as any)[kebabToCamel(button.icon)];
                let featherIcon =
                  (featherIcons as any)[kebabToCamel(button.icon)];
                if (!featherIcon) {
                  featherIcon = featherIcons.HelpCircle;
                }
                return {
                  icon: mdiIcon ? mdiIcon : featherIcon,
                  description: button.description || "",
                  callback: () => {
                    client.runCommandByName(
                      parsedCommand.name,
                      parsedCommand.args,
                    );
                  },
                  href: "",
                };
              }),
          ]}
          rhs={!!viewState.panels.rhs.mode && (
            <div
              className="panel"
              style={{ flex: viewState.panels.rhs.mode }}
            />
          )}
          lhs={!!viewState.panels.lhs.mode && (
            <div
              className="panel"
              style={{ flex: viewState.panels.lhs.mode }}
            />
          )}
          pageNamePrefix={viewState.currentPageMeta?.pageDecoration
            ?.prefix ??
            ""}
          cssClass={viewState.currentPageMeta?.pageDecoration?.cssClasses
            ? viewState.currentPageMeta?.pageDecoration?.cssClasses
              .join(" ").replaceAll(/[^a-zA-Z0-9-_ ]/g, "")
            : ""}
        />
        <div id="sb-main">
          {!!viewState.panels.lhs.mode && (
            <Panel config={viewState.panels.lhs} editor={client} />
          )}
          <div id="sb-editor" />
          {!!viewState.panels.rhs.mode && (
            <Panel config={viewState.panels.rhs} editor={client} />
          )}
        </div>
        {!!viewState.panels.modal.mode && (
          <div
            className="sb-modal"
            style={{ inset: `${viewState.panels.modal.mode}px` }}
          >
            <Panel config={viewState.panels.modal} editor={client} />
          </div>
        )}
        {!!viewState.panels.bhs.mode && (
          <div className="sb-bhs">
            <Panel config={viewState.panels.bhs} editor={client} />
          </div>
        )}
      </>
    );
  }

  render(container: Element) {
    // const ViewComponent = this.ui.ViewComponent.bind(this.ui);
    container.innerHTML = "";
    preactRender(h(this.ViewComponent.bind(this), {}), container);
  }
}

function kebabToCamel(str: string) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase()).replace(
    /^./,
    (g) => g.toUpperCase(),
  );
}
