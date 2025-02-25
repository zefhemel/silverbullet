// Forked from https://codeberg.org/retronav/ixora
// Original author: Pranav Karawale
// License: Apache License 2.0.
import {
  type EditorState,
  StateField,
  type Transaction,
} from "@codemirror/state";
import type { DecorationSet } from "@codemirror/view";
import { Decoration, EditorView, WidgetType } from "@codemirror/view";
import type { Client } from "../client.ts";
import type { PageMeta } from "@silverbulletmd/silverbullet/types";

type LinkOptions = {
  text: string;
  href?: string;
  title: string;
  cssClass: string;
  from: number;
  callback: (e: MouseEvent) => void;
};

export class LinkWidget extends WidgetType {
  constructor(
    readonly options: LinkOptions,
  ) {
    super();
  }
  toDOM(): HTMLElement {
    const anchor = document.createElement("a");
    anchor.className = this.options.cssClass;
    anchor.textContent = this.options.text;

    // Mouse handling
    anchor.addEventListener("click", (e) => {
      if (e.button !== 0) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      try {
        this.options.callback(e);
      } catch (e) {
        console.error("Error handling wiki link click", e);
      }
    });

    // Touch handling
    let touchCount = 0;
    anchor.addEventListener("touchmove", () => {
      touchCount++;
    });
    anchor.addEventListener("touchend", (e) => {
      if (touchCount === 0) {
        e.preventDefault();
        e.stopPropagation();
        this.options.callback(new MouseEvent("click", e));
      }
      touchCount = 0;
    });
    anchor.setAttribute("title", this.options.title);
    anchor.href = this.options.href || "#";
    return anchor;
  }

  override eq(other: WidgetType): boolean {
    return other instanceof LinkWidget &&
      this.options.from === other.options.from &&
      this.options.text === other.options.text &&
      this.options.href === other.options.href &&
      this.options.title === other.options.title;
  }
}

export class HtmlWidget extends WidgetType {
  constructor(
    readonly html: string,
    readonly className?: string,
    readonly onClick?: (e: MouseEvent) => void,
  ) {
    super();
  }
  toDOM(): HTMLElement {
    const el = document.createElement("span");
    if (this.className) {
      el.className = this.className;
    }
    if (this.onClick) {
      el.addEventListener("click", this.onClick);
    }
    el.innerHTML = this.html;
    return el;
  }
}

export function decoratorStateField(
  stateToDecoratorMapper: (state: EditorState) => DecorationSet,
) {
  return StateField.define<DecorationSet>({
    create(state: EditorState) {
      return stateToDecoratorMapper(state);
    },

    update(value: DecorationSet, tr: Transaction) {
      if (tr.isUserEvent("select.pointer")) return value;
      return stateToDecoratorMapper(tr.state);
    },

    provide: (f) => EditorView.decorations.from(f),
  });
}

export class ButtonWidget extends WidgetType {
  constructor(
    readonly text: string,
    readonly title: string,
    readonly cssClass: string,
    readonly callback: (e: MouseEvent) => void,
  ) {
    super();
  }
  toDOM(): HTMLElement {
    const anchor = document.createElement("button");
    anchor.className = this.cssClass;
    anchor.textContent = this.text;
    anchor.addEventListener("mouseup", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.callback(e);
    });
    anchor.setAttribute("title", this.title);
    return anchor;
  }
}

/**
 * Check if two ranges overlap
 * Based on the visual diagram on https://stackoverflow.com/a/25369187
 * @param range1 - Range 1
 * @param range2 - Range 2
 * @returns True if the ranges overlap
 */
export function checkRangeOverlap(
  range1: [number, number],
  range2: [number, number],
) {
  return range1[0] <= range2[1] && range2[0] <= range1[1];
}

/**
 * Check if a range is inside another range
 * @param parent - Parent (bigger) range
 * @param child - Child (smaller) range
 * @returns True if child is inside parent
 */
export function checkRangeSubset(
  parent: [number, number],
  child: [number, number],
) {
  return child[0] >= parent[0] && child[1] <= parent[1];
}

/**
 * Check if any of the editor cursors is in the given range
 * @param state - Editor state
 * @param range - Range to check
 * @returns True if the cursor is in the range
 */
export function isCursorInRange(state: EditorState, range: [number, number]) {
  return state.selection.ranges.some((selection) =>
    checkRangeOverlap(range, [selection.from, selection.to])
  );
}

/**
 * Decoration to simply hide anything.
 */
export const invisibleDecoration = Decoration.replace({});

export function shouldRenderWidgets(client: Client) {
  const currentPageMeta = client.ui.viewState.current?.meta as PageMeta;
  return !currentPageMeta?.tags?.includes("template") &&
    currentPageMeta?.pageDecoration?.renderWidgets !== false &&
    !currentPageMeta?.name.startsWith("!");
}
