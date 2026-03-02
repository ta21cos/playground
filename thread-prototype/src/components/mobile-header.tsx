import { getChannels } from "@/app/actions/channels";
import { getNotes } from "@/app/actions/stocks";
import { MobileSidebar } from "./mobile-sidebar";

export async function MobileHeader() {
  const [channelList, notes] = await Promise.all([getChannels(), getNotes()]);

  return (
    <header className="flex h-14 items-center border-b px-4 md:hidden">
      <MobileSidebar channels={channelList} notes={notes} />
      <h1 className="ml-3 text-lg font-semibold">Threads</h1>
    </header>
  );
}
