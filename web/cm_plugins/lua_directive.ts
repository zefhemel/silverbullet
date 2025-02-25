import type { EditorState, Range } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import { Decoration } from "@codemirror/view";
import {
  decoratorStateField,
  invisibleDecoration,
  isCursorInRange,
  shouldRenderWidgets,
} from "./util.ts";
import type { Client } from "../client.ts";
import { parse as parseLua } from "$common/space_lua/parse.ts";
import type {
  LuaBlock,
  LuaFunctionCallStatement,
} from "$common/space_lua/ast.ts";
import { evalExpression } from "$common/space_lua/eval.ts";
import {
  LuaEnv,
  LuaStackFrame,
  luaValueToJS,
} from "$common/space_lua/runtime.ts";
import { LuaRuntimeError } from "$common/space_lua/runtime.ts";
import { encodePageRef } from "@silverbulletmd/silverbullet/lib/page_ref";
import { resolveASTReference } from "$common/space_lua.ts";
import { LuaWidget } from "./lua_widget.ts";
import type { PageMeta } from "@silverbulletmd/silverbullet/types";

export function luaDirectivePlugin(client: Client) {
  return decoratorStateField((state: EditorState) => {
    const widgets: Range<Decoration>[] = [];
    if (!shouldRenderWidgets(client)) {
      console.info("Not rendering widgets");
      return Decoration.set([]);
    }

    syntaxTree(state).iterate({
      enter: (node) => {
        if (node.name !== "LuaDirective") {
          return;
        }

        if (isCursorInRange(state, [node.from, node.to])) {
          return;
        }

        const text = state.sliceDoc(node.from + 2, node.to - 1);
        const currentPageMeta = client.ui.viewState.current?.meta as PageMeta;
        widgets.push(
          Decoration.widget({
            widget: new LuaWidget(
              node.from,
              client,
              `lua:${text}:${currentPageMeta?.name}`,
              text,
              async (bodyText) => {
                try {
                  const parsedLua = parseLua(`_(${bodyText})`) as LuaBlock;
                  const expr =
                    (parsedLua.statements[0] as LuaFunctionCallStatement).call
                      .args[0];

                  const tl = new LuaEnv();
                  tl.setLocal(
                    "currentPage",
                    currentPageMeta ||
                      { name: client.ui.viewState.current?.path },
                  );
                  const sf = LuaStackFrame.createWithGlobalEnv(
                    client.clientSystem.spaceLuaEnv.env,
                    expr.ctx,
                  );
                  const threadLocalizedEnv = new LuaEnv(
                    client.clientSystem.spaceLuaEnv.env,
                  );
                  threadLocalizedEnv.setLocal("_CTX", tl);
                  const result = luaValueToJS(
                    await evalExpression(
                      expr,
                      threadLocalizedEnv,
                      sf,
                    ),
                  );
                  // console.log("Result:", result);
                  return result;
                } catch (e: any) {
                  if (e instanceof LuaRuntimeError) {
                    if (e.sf?.astCtx) {
                      const source = resolveASTReference(e.sf.astCtx);
                      if (source) {
                        // We know the origin node of the error, let's reference it
                        return {
                          markdown: `**Lua error:** ${e.message} (Origin: [[${
                            encodePageRef(source)
                          }]])`,
                        };
                      }
                    }
                  }
                  return {
                    markdown: `**Lua error:** ${e.message}`,
                  };
                }
              },
            ),
          }).range(node.to),
        );
        widgets.push(invisibleDecoration.range(node.from, node.to));
      },
    });

    return Decoration.set(widgets, true);
  });
}
