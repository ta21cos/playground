"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { searchEmojis } from "@/lib/emoji-data";

type Suggestion = { name: string; emoji: string };

export function useEmojiSuggest(
  content: string,
  cursorPosition: number,
  onInsert: (before: string, emoji: string, after: string) => void,
) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const { suggestions, colonStart } = useMemo(() => {
    const textBeforeCursor = content.slice(0, cursorPosition);
    const colonMatch = textBeforeCursor.match(/:([a-z_]{2,})$/);

    if (colonMatch) {
      const q = colonMatch[1];
      const start = cursorPosition - colonMatch[0].length;
      const results = searchEmojis(q);
      return { suggestions: results, colonStart: start };
    }
    return { suggestions: [] as Suggestion[], colonStart: -1 };
  }, [content, cursorPosition]);

  const isOpen = suggestions.length > 0 && !dismissed;

  const selectSuggestion = useCallback(
    (index: number) => {
      if (index < 0 || index >= suggestions.length || colonStart < 0) return;
      const suggestion = suggestions[index];
      const before = content.slice(0, colonStart);
      const after = content.slice(cursorPosition);
      onInsert(before, suggestion.emoji, after);
    },
    [suggestions, colonStart, content, cursorPosition, onInsert],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return false;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % suggestions.length);
        return true;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (i) => (i - 1 + suggestions.length) % suggestions.length,
        );
        return true;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectSuggestion(selectedIndex);
        return true;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setDismissed(true);
        return true;
      }
      return false;
    },
    [isOpen, suggestions, selectedIndex, selectSuggestion],
  );

  const handleChange = useCallback(() => {
    setDismissed(false);
    setSelectedIndex(0);
  }, []);

  return {
    isOpen,
    suggestions,
    selectedIndex,
    handleKeyDown,
    selectSuggestion,
    handleChange,
  };
}

export function EmojiSuggestPopover({
  suggestions,
  selectedIndex,
  onSelect,
}: {
  suggestions: Suggestion[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.children[selectedIndex] as HTMLElement;
      selected?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (suggestions.length === 0) return null;

  return (
    <div
      ref={listRef}
      className="absolute bottom-full left-0 mb-1 max-h-48 w-64 overflow-y-auto rounded-md border bg-background shadow-lg"
    >
      {suggestions.map((s, i) => (
        <button
          key={s.name}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(i);
          }}
          className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm ${
            i === selectedIndex ? "bg-muted" : "hover:bg-muted/50"
          }`}
        >
          <span className="text-lg">{s.emoji}</span>
          <span className="text-muted-foreground">:{s.name}:</span>
        </button>
      ))}
    </div>
  );
}
