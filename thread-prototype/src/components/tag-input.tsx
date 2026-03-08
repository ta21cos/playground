"use client";

import { useState, useRef } from "react";
import { X, Hash, Plus } from "lucide-react";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
}

export function TagInput({ tags, onChange, suggestions }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(inputValue.toLowerCase()) &&
      !tags.includes(s.toLowerCase()),
  );

  function addTag(value: string) {
    const normalized = value.toLowerCase().trim();
    if (normalized && !tags.includes(normalized)) {
      onChange([...tags, normalized]);
    }
    setInputValue("");
    setOpen(false);
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    }
    if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div className="relative flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="group inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
        >
          <Hash className="h-3 w-3 opacity-50" />
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="ml-0.5 rounded-full opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      <div className="relative">
        {open ? (
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            autoFocus
            placeholder="Add tag..."
            className="h-6 w-24 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setOpen(true);
            }}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/30 px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-muted-foreground/60 hover:text-foreground"
          >
            <Plus className="h-3 w-3" />
            Tag
          </button>
        )}

        {open && (inputValue || filteredSuggestions.length > 0) && (
          <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-lg border bg-popover p-1 shadow-lg">
            {filteredSuggestions.length > 0 ? (
              filteredSuggestions.slice(0, 8).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addTag(suggestion);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent"
                >
                  <Hash className="h-3 w-3 text-muted-foreground" />
                  {suggestion}
                </button>
              ))
            ) : inputValue.trim() ? (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(inputValue);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent"
              >
                <Plus className="h-3 w-3 text-muted-foreground" />
                Create &quot;{inputValue.trim().toLowerCase()}&quot;
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
