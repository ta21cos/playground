"use client";

import { useState, useRef } from "react";
import { Folder, ChevronDown } from "lucide-react";

interface GroupSelectProps {
  value: string;
  onChange: (value: string) => void;
  groups: string[];
}

export function GroupSelect({ value, onChange, groups }: GroupSelectProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredGroups = groups.filter((g) =>
    g.toLowerCase().includes(inputValue.toLowerCase()),
  );

  function selectGroup(group: string) {
    onChange(group);
    setInputValue(group);
    setOpen(false);
  }

  return (
    <div className="relative">
      {open ? (
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            onChange(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setOpen(false);
            }
            if (e.key === "Escape") {
              setOpen(false);
              inputRef.current?.blur();
            }
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          autoFocus
          placeholder="Group name..."
          className="h-6 w-28 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
        />
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Folder className="h-3 w-3" />
          {value || "No group"}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </button>
      )}

      {open && filteredGroups.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[140px] overflow-hidden rounded-lg border bg-popover p-1 shadow-lg">
          {filteredGroups.map((group) => (
            <button
              key={group}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                selectGroup(group);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent"
            >
              <Folder className="h-3 w-3 text-muted-foreground" />
              {group}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
