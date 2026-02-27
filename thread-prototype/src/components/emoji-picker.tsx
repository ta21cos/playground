"use client";

import { useState, useRef, useEffect } from "react";
import { EMOJI_CATEGORIES } from "@/lib/emoji-data";

export function EmojiPicker({
  onSelect,
  onClose,
}: {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  const [activeCategory, setActiveCategory] = useState(0);
  const [filter, setFilter] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const filteredCategories = filter
    ? EMOJI_CATEGORIES.map((cat) => ({
        ...cat,
        emojis: cat.emojis.filter((e) => e.name.includes(filter.toLowerCase())),
      })).filter((cat) => cat.emojis.length > 0)
    : EMOJI_CATEGORIES;

  return (
    <div ref={ref} className="w-72 rounded-lg border bg-background shadow-lg">
      <div className="border-b p-2">
        <input
          type="text"
          placeholder="Search emoji..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full rounded-md border bg-transparent px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
          autoFocus
        />
      </div>

      {!filter && (
        <div className="flex gap-0.5 border-b px-2 py-1">
          {EMOJI_CATEGORIES.map((cat, idx) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(idx)}
              className={`rounded px-1.5 py-0.5 text-sm transition-colors ${
                idx === activeCategory ? "bg-muted" : "hover:bg-muted/50"
              }`}
              title={cat.name}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      <div className="max-h-48 overflow-y-auto p-2">
        {filter ? (
          filteredCategories.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No emoji found
            </p>
          ) : (
            filteredCategories.map((cat) => (
              <div key={cat.name}>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  {cat.name}
                </p>
                <div className="mb-2 grid grid-cols-8 gap-0.5">
                  {cat.emojis.map((e) => (
                    <button
                      key={e.name}
                      onClick={() => onSelect(e.emoji)}
                      className="flex h-8 w-8 items-center justify-center rounded text-lg transition-colors hover:bg-muted"
                      title={`:${e.name}:`}
                    >
                      {e.emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )
        ) : (
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              {EMOJI_CATEGORIES[activeCategory].name}
            </p>
            <div className="grid grid-cols-8 gap-0.5">
              {EMOJI_CATEGORIES[activeCategory].emojis.map((e) => (
                <button
                  key={e.name}
                  onClick={() => onSelect(e.emoji)}
                  className="flex h-8 w-8 items-center justify-center rounded text-lg transition-colors hover:bg-muted"
                  title={`:${e.name}:`}
                >
                  {e.emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
