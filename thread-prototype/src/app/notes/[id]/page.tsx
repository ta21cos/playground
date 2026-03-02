import { notFound } from "next/navigation";
import { NoteEditor } from "@/components/note-editor";
import {
  getNoteById,
  getNoteTags,
  getGroups,
  getAllTags,
} from "@/app/actions/stocks";

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [note, tags, groups, tagSuggestions] = await Promise.all([
    getNoteById(id),
    getNoteTags(id),
    getGroups(),
    getAllTags(),
  ]);

  if (!note) {
    notFound();
  }

  return (
    <NoteEditor
      note={note}
      initialTags={tags.map((t) => t.tag)}
      existingGroups={groups}
      tagSuggestions={tagSuggestions}
    />
  );
}
