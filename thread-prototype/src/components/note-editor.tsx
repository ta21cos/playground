"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "./tag-input";
import { GroupSelect } from "./group-select";
import { createNote, updateNote, deleteNote } from "@/app/actions/stocks";
import type { Stock } from "@/db/schema";
import { Trash2 } from "lucide-react";

interface NoteEditorProps {
  note?: Stock | null;
  initialTags?: string[];
  existingGroups: string[];
  tagSuggestions: string[];
}

export function NoteEditor({
  note,
  initialTags = [],
  existingGroups,
  tagSuggestions,
}: NoteEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [group, setGroup] = useState(note?.group ?? "");
  const [tags, setTags] = useState<string[]>(initialTags);

  function handleSave() {
    const formData = new FormData();
    formData.set("title", title);
    formData.set("content", content);
    formData.set("group", group);
    formData.set("tags", JSON.stringify(tags));

    startTransition(async () => {
      if (note) {
        await updateNote(note.id, formData);
      } else {
        const result = await createNote(formData);
        if (result.id) {
          router.push(`/notes/${result.id}`);
          return;
        }
      }
      router.refresh();
    });
  }

  function handleDelete() {
    if (!note) return;
    if (!window.confirm("Delete this note?")) return;

    startTransition(async () => {
      await deleteNote(note.id);
      router.push("/notes");
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {note ? "Edit Note" : "New Note"}
        </h1>
        <div className="flex items-center gap-2">
          {note && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isPending}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
          )}
          <Button onClick={handleSave} disabled={isPending || !title.trim()}>
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">Content</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your note in Markdown..."
            className="min-h-[300px] font-mono"
          />
        </div>

        <div className="space-y-2">
          <Label>Group</Label>
          <GroupSelect
            value={group}
            onChange={setGroup}
            groups={existingGroups}
          />
        </div>

        <div className="space-y-2">
          <Label>Tags</Label>
          <TagInput
            tags={tags}
            onChange={setTags}
            suggestions={tagSuggestions}
          />
        </div>
      </div>
    </div>
  );
}
