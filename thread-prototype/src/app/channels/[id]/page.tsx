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
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b pb-4">
          <div className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">{channel.name}</h2>
          </div>
          {channel.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {channel.description}
            </p>
          )}
        </div>
        <CalendarView channelId={channelId} />
        <MessageList
          messages={messages}
          threadReplyCounts={threadReplyCounts}
          reactionsByMessage={reactionsByMessage}
          highlightMessageId={highlight}
        />
        <MessageInput channelId={channelId} />
      </div>
      <Suspense>
        <ThreadPanel channelId={channelId} />
      </Suspense>
    </div>
  );
}
