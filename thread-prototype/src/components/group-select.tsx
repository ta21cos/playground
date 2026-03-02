"use client";

import { useState } from "react";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

interface GroupSelectProps {
  value: string;
  onChange: (value: string) => void;
  groups: string[];
}

export function GroupSelect({ value, onChange, groups }: GroupSelectProps) {
  const [inputValue, setInputValue] = useState(value);
  const [open, setOpen] = useState(false);

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
      <Command className="border rounded-md" shouldFilter={false}>
        <CommandInput
          value={inputValue}
          onValueChange={(val) => {
            setInputValue(val);
            onChange(val);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="Select or create group..."
        />
        {open && (inputValue || filteredGroups.length > 0) && (
          <CommandList>
            <CommandEmpty>
              {inputValue.trim() && (
                <span className="px-2 py-1.5 text-sm text-muted-foreground">
                  New group: &quot;{inputValue.trim()}&quot;
                </span>
              )}
            </CommandEmpty>
            {filteredGroups.length > 0 && (
              <CommandGroup>
                {filteredGroups.map((group) => (
                  <CommandItem
                    key={group}
                    value={group}
                    onSelect={() => selectGroup(group)}
                  >
                    {group}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        )}
      </Command>
    </div>
  );
}
