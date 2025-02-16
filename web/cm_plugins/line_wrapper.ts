import type { EditorState, Range } from "@codemirror/state";
import { Decoration } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { decoratorStateField } from "./util.ts";

interface WrapElement {
  selector: string;
  class: string;
  nesting?: boolean;
}

export function lineWrapper(wrapElements: WrapElement[]) {
  return decoratorStateField((state: EditorState) => {
    const widgets: Range<Decoration>[] = [];
    const elementStack: string[] = [];
    const doc = state.doc;
    syntaxTree(state).iterate({
      enter: ({ type, from, to }) => {
        for (const wrapElement of wrapElements) {
          if (type.name == wrapElement.selector) {
            if (wrapElement.nesting) {
              elementStack.push(type.name);
            }
            const bodyText = doc.sliceString(from, to);
            let idx = from;
            for (const line of bodyText.split("\n")) {
              let cls = wrapElement.class;
              if (wrapElement.nesting) {
                cls = `${cls} ${cls}-${elementStack.length}`;
              }
              widgets.push(
                Decoration.line({
                  class: cls,
                }).range(doc.lineAt(idx).from),
              );
              idx += line.length + 1;
            }
          }
        }
      },
      leave({ type }) {
        for (const wrapElement of wrapElements) {
          if (type.name == wrapElement.selector && wrapElement.nesting) {
            elementStack.pop();
          }
        }
      },
    });

    return Decoration.set(widgets, true);
  });
}
