import type { EditorState, Range } from "@codemirror/state";
import { Decoration } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { decoratorStateField } from "./util.ts";

export function disableSpellcheck(selectors: string[]) {
  return decoratorStateField((state: EditorState) => {
    const widgets: Range<Decoration>[] = [];
    syntaxTree(state).iterate({
      enter: ({ type, from, to }) => {
        for (const selector of selectors) {
          if (type.name === selector) {
            widgets.push(
              Decoration.mark({
                attributes: { spellcheck: "false" },
              }).range(from, to),
            );
          }
        }
      },
    });

    return Decoration.set(widgets, true);
  });
}
