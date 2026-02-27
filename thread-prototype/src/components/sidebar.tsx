import { getChannels } from "@/app/actions/channels";
import { ChannelList } from "./channel-list";
import { CreateChannelDialog } from "./create-channel-dialog";

export async function Sidebar() {
  const channelList = await getChannels();

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-muted/30 md:flex md:flex-col">
      <div className="flex h-14 items-center border-b px-4">
        <h1 className="text-lg font-semibold">Threads</h1>
      </div>
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-medium text-muted-foreground">
          Channels
        </span>
        <CreateChannelDialog />
      </div>
      <nav className="flex-1 overflow-auto px-2">
        <ChannelList channels={channelList} />
      </nav>
    </aside>
  );
}
