import type { FeatherProps } from "preact-feather/types";
import type {
  CompletionContext,
  CompletionResult,
} from "@codemirror/autocomplete";
import type { FunctionalComponent } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import type { FilterOption } from "@silverbulletmd/silverbullet/type/client";
import { MiniEditor } from "./mini_editor.tsx";
import { fuzzySearchAndSort } from "../fuse_search.ts";
import { deepEqual } from "../../plug-api/lib/json.ts";
import { AlwaysShownModal } from "./basic_modals.tsx";

export function FilterList({
  placeholder,
  options,
  label,
  onSelect,
  onKeyPress,
  completer,
  vimMode,
  darkMode,
  preFilter,
  phrasePreprocessor,
  allowNew = false,
  helpText = "",
  completePrefix,
  icon: Icon,
  newHint,
}: {
  placeholder: string;
  options: FilterOption[];
  label: string;
  onKeyPress?: (key: string, currentText: string) => void;
  onSelect: (option: FilterOption | undefined) => void;
  preFilter?: (options: FilterOption[], phrase: string) => FilterOption[];
  phrasePreprocessor?: (phrase: string) => string;
  vimMode: boolean;
  darkMode: boolean;
  completer: (context: CompletionContext) => Promise<CompletionResult | null>;
  allowNew?: boolean;
  completePrefix?: string;
  helpText: string;
  newHint?: string;
  icon?: FunctionalComponent<FeatherProps>;
}) {
  const [text, setText] = useState("");
  const [matchingOptions, setMatchingOptions] = useState(
    fuzzySearchAndSort(
      preFilter ? preFilter(options, "") : options,
      "",
    ),
  );
  const [selectedOption, setSelectionOption] = useState(0);

  const selectedElementRef = useRef<HTMLDivElement>(null);

  function updateFilter(originalPhrase: string) {
    const prefilteredOptions = preFilter
      ? preFilter(options, originalPhrase)
      : options;
    if (phrasePreprocessor) {
      originalPhrase = phrasePreprocessor(originalPhrase);
    }
    const results = fuzzySearchAndSort(prefilteredOptions, originalPhrase);
    const foundExactMatch = !!results.find((result) =>
      result.name === originalPhrase
    );
    if (allowNew && !foundExactMatch && originalPhrase) {
      results.splice(1, 0, {
        name: originalPhrase,
        hint: newHint,
      });
    }

    if (!deepEqual(matchingOptions, results)) {
      // Only do this (=> rerender of UI) if the results have changed
      setMatchingOptions(results);
      setSelectionOption(0);
    }
  }

  useEffect(() => {
    updateFilter(text);
  }, [options, text]);

  useEffect(() => {
    function closer() {
      onSelect(undefined);
    }

    document.addEventListener("click", closer);

    return () => {
      document.removeEventListener("click", closer);
    };
  }, []);

  const returnEl = (
    <AlwaysShownModal
      onCancel={() => {
        onSelect(undefined);
      }}
    >
      <div
        className="sb-header"
        onClick={(e) => {
          // Allow tapping/clicking the header without closing it
          e.stopPropagation();
        }}
      >
        <label>{label}</label>
        <MiniEditor
          text={text}
          vimMode={vimMode}
          vimStartInInsertMode={true}
          focus={true}
          darkMode={darkMode}
          completer={completer}
          placeholderText={placeholder}
          onEnter={(_newText, shiftDown) => {
            onSelect(
              shiftDown ? { name: text } : matchingOptions[selectedOption],
            );
            return true;
          }}
          onEscape={() => {
            onSelect(undefined);
          }}
          onChange={(text) => {
            setText(text);
          }}
          onKeyUp={(view, e) => {
            // This event is triggered after the key has been processed by CM already
            if (onKeyPress) {
              onKeyPress(e.key, view.state.sliceDoc());
            }
            return false;
          }}
          onKeyDown={(view, e) => {
            switch (e.key) {
              case "ArrowUp":
                setSelectionOption(Math.max(0, selectedOption - 1));
                return true;
              case "ArrowDown":
                setSelectionOption(
                  Math.min(matchingOptions.length - 1, selectedOption + 1),
                );
                return true;
              case "PageUp":
                setSelectionOption(Math.max(0, selectedOption - 5));
                return true;
              case "PageDown":
                setSelectionOption(
                  Math.min(matchingOptions.length - 1, selectedOption + 5),
                );
                return true;
              case "Home":
                setSelectionOption(0);
                return true;
              case "End":
                setSelectionOption(matchingOptions.length - 1);
                return true;
              case " ": {
                const text = view.state.sliceDoc();
                if (e.shiftKey) {
                  // Operate on the highlighted option, ignoring prompt
                  const option = matchingOptions[selectedOption].name;
                  // Get the folder it's nested in, keeping the trailing /
                  const folderPath = option.slice(
                    0,
                    option.lastIndexOf("/") + 1,
                  );
                  // If the option wasn't in a folder, make it a folder
                  setText(folderPath !== "" ? folderPath : option + "/");
                  return true;
                } else if (completePrefix && text === "") {
                  setText(completePrefix);
                  // updateFilter(completePrefix);
                  return true;
                }
                break;
              }
            }
            if (e.ctrlKey && e.key === "n") {
              setSelectionOption(
                Math.min(matchingOptions.length - 1, selectedOption + 1),
              );
              return true;
            }
            if (e.ctrlKey && e.key === "p") {
              setSelectionOption(Math.max(0, selectedOption - 1));
              return true;
            }
            return false;
          }}
        />
      </div>
      <div
        className="sb-help-text"
        dangerouslySetInnerHTML={{ __html: helpText }}
      >
      </div>
      <div className="sb-result-list" tabIndex={-1}>
        {matchingOptions && matchingOptions.length > 0
          ? matchingOptions.map((option, idx) => (
            <div
              key={"" + idx}
              ref={selectedOption === idx ? selectedElementRef : undefined}
              className={(selectedOption === idx
                ? "sb-option sb-selected-option"
                : "sb-option") +
                (option.cssClass
                  ? " sb-decorated-object " + option.cssClass
                  : "")}
              onMouseMove={() => {
                if (selectedOption !== idx) {
                  setSelectionOption(idx);
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(option);
              }}
            >
              {Icon && (
                <span className="sb-icon">
                  <Icon width={16} height={16} />
                </span>
              )}
              <span className="sb-name">
                {option.name}
              </span>
              {option.hint && <span className={ "sb-hint" + (option.hintInactive ? " sb-hint-inactive": "")}>{option.hint}</span>}
              <div className="sb-description">{option.description}</div>
            </div>
          ))
          : null}
      </div>
    </AlwaysShownModal>
  );

  useEffect(() => {
    selectedElementRef.current?.scrollIntoView({
      block: "nearest",
    });
  });

  return returnEl;
}
