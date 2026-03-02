import { NoteEditor } from "@/components/note-editor";
import { getGroups, getAllTags } from "@/app/actions/stocks";

export default async function NewNotePage() {
  const [groups, tagSuggestions] = await Promise.all([
    getGroups(),
    getAllTags(),
  ]);

  return <NoteEditor existingGroups={groups} tagSuggestions={tagSuggestions} />;
}
