import { Hash } from "lucide-react";
import { notFound } from "next/navigation";
import { getChannel } from "@/app/actions/channels";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const channel = await getChannel(Number(id));

  if (!channel) {
    notFound();
  }

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
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Messages will appear here in a future update.
        </p>
      </div>
    </div>
  );
}
