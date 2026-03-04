"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, ChevronRight, FileText, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Stock } from "@/db/schema";

interface SidebarNotesProps {
  notes: Stock[];
  onNavigate?: () => void;
}

interface GroupedNotes {
  [group: string]: Stock[];
}

export function SidebarNotes({ notes, onNavigate }: SidebarNotesProps) {
  const pathname = usePathname();

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

  return (
    <div className="space-y-0.5">
      {groupNames.map((group) => (
        <SidebarGroup
          key={group}
          group={group}
          notes={grouped[group]}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      ))}
      {ungrouped.map((note) => (
        <NoteLink
          key={note.id}
          note={note}
          isActive={pathname === `/notes/${note.id}`}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

function SidebarGroup({
  group,
  notes,
  pathname,
  onNavigate,
}: {
  group: string;
  notes: Stock[];
  pathname: string;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
      >
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <BookOpen className="h-3 w-3" />
        <span className="truncate">{group}</span>
      </button>
      {open && (
        <ul className="ml-3 space-y-0.5">
          {notes.map((note) => (
            <li key={note.id}>
              <NoteLink
                note={note}
                isActive={pathname === `/notes/${note.id}`}
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NoteLink({
  note,
  isActive,
  onNavigate,
}: {
  note: Stock;
  isActive: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={`/notes/${note.id}`}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent",
        isActive && "bg-accent font-medium",
      )}
    >
      <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate text-xs">{note.title}</span>
    </Link>
  );
}
