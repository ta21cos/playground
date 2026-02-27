import { Hash } from "lucide-react";
import { notFound } from "next/navigation";
import { getChannel } from "@/app/actions/channels";
import { getMessages } from "@/app/actions/messages";
import { MessageList } from "@/components/message-list";
import { MessageInput } from "@/components/message-input";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const channelId = Number(id);
  const channel = await getChannel(channelId);

  if (!channel) {
    notFound();
  }

  const messages = await getMessages(channelId);

  return (
    <div className="flex h-full flex-col">
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
      <MessageList messages={messages} />
      <MessageInput channelId={channelId} />
    </div>
  );
}
