"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import type { Stock } from "@/db/schema";

interface NoteListProps {
  notes: Stock[];
}

interface GroupedNotes {
  [group: string]: Stock[];
}

export function NoteList({ notes }: NoteListProps) {
  const grouped: GroupedNotes = {};
  const ungrouped: Stock[] = [];

  for (const note of notes) {
    if (note.group) {
      if (!grouped[note.group]) {
        grouped[note.group] = [];
      }
      grouped[note.group].push(note);
    } else {
      ungrouped.push(note);
    }
  }

  const groupNames = Object.keys(grouped).sort();

  if (notes.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <FileText className="mx-auto mb-3 h-12 w-12 opacity-50" />
        <p className="text-lg font-medium">No notes yet</p>
        <p className="mt-1 text-sm">Create your first note to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groupNames.map((group) => (
        <GroupAccordion key={group} group={group} notes={grouped[group]} />
      ))}
      {ungrouped.length > 0 && (
        <GroupAccordion group="Ungrouped" notes={ungrouped} />
      )}
    </div>
  );
}

function GroupAccordion({ group, notes }: { group: string; notes: Stock[] }) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
      >
        {open ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        {group}
        <span className="ml-auto text-xs">{notes.length}</span>
      </button>
      {open && (
        <ul className="ml-4 mt-1 space-y-0.5">
          {notes.map((note) => (
            <li key={note.id}>
              <Link
                href={`/notes/${note.id}`}
                className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent"
              >
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{note.title}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(note.updatedAt).toLocaleDateString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
