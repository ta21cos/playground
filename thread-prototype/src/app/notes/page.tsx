import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NoteList } from "@/components/note-list";
import { getNotes } from "@/app/actions/stocks";

export default async function NotesPage() {
  const notes = await getNotes();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notes</h1>
        <Link href="/notes/new">
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" />
            New Note
          </Button>
        </Link>
      </div>
      <NoteList notes={notes} />
    </div>
  );
}
