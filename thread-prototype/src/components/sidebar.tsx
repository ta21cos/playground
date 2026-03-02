import Link from "next/link";
import { Plus } from "lucide-react";
import { getChannels } from "@/app/actions/channels";
import { getNotes } from "@/app/actions/stocks";
import { ChannelList } from "./channel-list";
import { CreateChannelDialog } from "./create-channel-dialog";
import { SidebarNotes } from "./sidebar-notes";

export async function Sidebar() {
  const [channelList, notes] = await Promise.all([getChannels(), getNotes()]);

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-muted/30 md:flex md:flex-col">
      <div className="flex h-14 items-center border-b px-4">
        <h1 className="text-lg font-semibold">Threads</h1>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium text-muted-foreground">
            Channels
          </span>
          <CreateChannelDialog />
        </div>
        <nav className="px-2">
          <ChannelList channels={channelList} />
        </nav>

        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium text-muted-foreground">
            Notes
          </span>
          <Link
            href="/notes/new"
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
          </Link>
        </div>
        <nav className="px-2 pb-4">
          <Link
            href="/notes"
            className="mb-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent"
          >
            All Notes
          </Link>
          <SidebarNotes notes={notes} />
        </nav>
      </div>
    </aside>
  );
}
