import { Inbox } from "lucide-react";
import { InboxList } from "@/components/inbox-list";
import { getInboxItems, getNotes } from "@/app/actions/stocks";

export default async function InboxPage() {
  const [items, notes] = await Promise.all([getInboxItems(), getNotes()]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-2">
        <Inbox className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Inbox</h1>
      </div>
      <InboxList items={items} existingNotes={notes} />
    </div>
  );
}
