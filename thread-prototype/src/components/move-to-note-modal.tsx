"use client";

import { useState, useTransition } from "react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { FilePlus, FileText } from "lucide-react";
import {
  moveToNote,
  mergeIntoNote,
  moveMultipleToNote,
} from "@/app/actions/stocks";
import type { Stock } from "@/db/schema";

export function MoveToNoteModal({
  open,
  onOpenChange,
  stockIds,
  existingNotes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockIds: string[];
  existingNotes: Stock[];
}) {
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) setSearch("");
    onOpenChange(nextOpen);
  };

  const handleCreateNew = () => {
    startTransition(async () => {
      if (stockIds.length === 1) {
        await moveToNote(stockIds[0]);
      } else {
        await moveMultipleToNote(stockIds);
      }
      onOpenChange(false);
    });
  };

  const handleMerge = (targetNoteId: string) => {
    startTransition(async () => {
      for (const stockId of stockIds) {
        await mergeIntoNote(stockId, targetNoteId);
      }
      onOpenChange(false);
    });
  };

  const filteredNotes = existingNotes.filter((note) =>
    note.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Move to Note"
      description="Save as a new note or merge into an existing one"
    >
      <CommandInput
        placeholder="Search notes..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No matching notes found.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={handleCreateNew} disabled={isPending}>
            <FilePlus className="mr-2 h-4 w-4" />
            Save as new note
          </CommandItem>
        </CommandGroup>
        {filteredNotes.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Merge into existing note">
              {filteredNotes.map((note) => (
                <CommandItem
                  key={note.id}
                  onSelect={() => handleMerge(note.id)}
                  disabled={isPending}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{note.title}</span>
                    {note.group && (
                      <span className="text-xs text-muted-foreground">
                        {note.group}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
