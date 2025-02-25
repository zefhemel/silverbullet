import type { System } from "../lib/plugos/system.ts";
import type { ScriptObject } from "../plugs/index/script.ts";
import {
  LuaEnv,
  LuaRuntimeError,
  LuaStackFrame,
} from "$common/space_lua/runtime.ts";
import { parse as parseLua } from "$common/space_lua/parse.ts";
import { evalStatement } from "$common/space_lua/eval.ts";
import {
  type PageRef,
  parsePageRef,
} from "@silverbulletmd/silverbullet/lib/page_ref";
import type { ASTCtx } from "$common/space_lua/ast.ts";
import { buildLuaEnv } from "$common/space_lua_api.ts";

export class SpaceLuaEnvironment {
  env: LuaEnv = new LuaEnv();

  /**
   * Loads all Lua scripts from the database and evaluates them in a new environment
   * @param system
   */
  async reload(
    system: System<any>,
  ) {
    const allScripts: ScriptObject[] = await system.invokeFunction(
      "index.queryObjects",
      ["space-lua", {
        orderBy: [{
          expr: ["attr", "priority"],
          desc: true,
        }],
      }],
    );
    try {
      this.env = buildLuaEnv(system);
      const tl = new LuaEnv();
      tl.setLocal("_GLOBAL", this.env);
      for (const script of allScripts) {
        try {
          console.log("Now evaluating", script.ref);
          const ast = parseLua(script.script, { ref: script.ref });
          // We create a local scope for each script
          const scriptEnv = new LuaEnv(this.env);
          const sf = new LuaStackFrame(tl, ast.ctx);
          await evalStatement(ast, scriptEnv, sf);
        } catch (e: any) {
          if (e instanceof LuaRuntimeError) {
            const origin = resolveASTReference(e.sf.astCtx!);
            if (origin) {
              console.error(
                `Error evaluating script: ${e.message} at [[${origin.page}@${origin.pos}]]`,
              );
              continue;
            }
          }
          console.error(
            `Error evaluating script: ${e.message} for script: ${script.script}`,
          );
        }
      }

      console.log("[Lua] Loaded", allScripts.length, "scripts");
    } catch (e: any) {
      console.error("Error reloading Lua scripts:", e.message);
    }
  }
}

export function resolveASTReference(ctx?: ASTCtx): PageRef | null {
  if (!ctx?.ref) {
    return null;
  }
  const pageRef = parsePageRef(ctx.ref);
  return {
    kind: "page",
    page: pageRef.page,
    pos: (pageRef.pos as number) + "```space-lua\n".length + ctx.from!,
  };
}
