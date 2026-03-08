import { Suspense } from "react";
import { Hash } from "lucide-react";
import { notFound } from "next/navigation";
import { getChannel } from "@/app/actions/channels";
import { getMessages } from "@/app/actions/messages";
import { getThreadReplyCounts } from "@/app/actions/threads";
import { getReactionsForMessages } from "@/app/actions/reactions";
import { MessageList } from "@/components/message-list";
import { MessageInput } from "@/components/message-input";
import { ThreadPanel } from "@/components/thread-panel";
import { CalendarView } from "@/components/calendar-view";

export default async function ChannelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ highlight?: string }>;
}) {
  const { id } = await params;
  const { highlight } = await searchParams;
  const channelId = Number(id);
  const channel = await getChannel(channelId);

  if (!channel) {
    notFound();
  }

  const messages = await getMessages(channelId);
  const messageIds = messages.map((m) => m.id);
  const [threadReplyCounts, reactionsByMessage] = await Promise.all([
    getThreadReplyCounts(messageIds),
    getReactionsForMessages(messageIds),
  ]);

  return (
    <div className="-m-6 flex h-[calc(100%+48px)]">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b px-6">
          <Hash className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold leading-tight">
              {channel.name}
            </h2>
            {channel.description && (
              <p className="text-xs text-muted-foreground">
                {channel.description}
              </p>
            )}
          </div>
        </div>
        <CalendarView channelId={channelId} />
        <div className="flex-1 overflow-auto px-6">
          <MessageList
            messages={messages}
            threadReplyCounts={threadReplyCounts}
            reactionsByMessage={reactionsByMessage}
            highlightMessageId={highlight}
          />
        </div>
        <div className="shrink-0 px-6 pb-4">
          <MessageInput channelId={channelId} />
        </div>
      </div>
      <Suspense>
        <ThreadPanel channelId={channelId} />
      </Suspense>
    </div>
  );
}
