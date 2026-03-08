import { getChannels } from "@/app/actions/channels";
import { getNotes, getInboxCount } from "@/app/actions/stocks";
import { MobileSidebar } from "./mobile-sidebar";
import { ThemeToggle } from "./theme-toggle";

export async function MobileHeader() {
  const [channelList, notes, inboxCount] = await Promise.all([
    getChannels(),
    getNotes(),
    getInboxCount(),
  ]);

  return (
    <header className="flex h-14 items-center border-b px-4 md:hidden">
      <MobileSidebar
        channels={channelList}
        notes={notes}
        inboxCount={inboxCount}
      />
      <h1 className="ml-3 flex-1 text-lg font-semibold">Threads</h1>
      <ThemeToggle />
    </header>
  );
}
