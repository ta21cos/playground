"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
}

export function TagInput({ tags, onChange, suggestions }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [open, setOpen] = useState(false);
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
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-sm"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="relative">
        <Command className="border rounded-md" shouldFilter={false}>
          <CommandInput
            value={inputValue}
            onValueChange={(val) => {
              setInputValue(val);
              setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 200)}
            placeholder="Add tag..."
          />
          {open && (inputValue || filteredSuggestions.length > 0) && (
            <CommandList>
              <CommandEmpty>
                {inputValue.trim() && (
                  <button
                    type="button"
                    className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent rounded"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addTag(inputValue);
                    }}
                  >
                    Create &quot;{inputValue.trim().toLowerCase()}&quot;
                  </button>
                )}
              </CommandEmpty>
              {filteredSuggestions.length > 0 && (
                <CommandGroup>
                  {filteredSuggestions.map((suggestion) => (
                    <CommandItem
                      key={suggestion}
                      value={suggestion}
                      onSelect={() => addTag(suggestion)}
                    >
                      {suggestion}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          )}
        </Command>
      </div>
    </div>
  );
}
