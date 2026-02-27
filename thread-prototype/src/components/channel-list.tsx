"use client";

import { Hash } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Channel } from "@/db/schema";
import { ChannelActions } from "./channel-actions";
import { cn } from "@/lib/utils";

interface ChannelListProps {
  channels: Channel[];
  onNavigate?: () => void;
}

export function ChannelList({ channels, onNavigate }: ChannelListProps) {
  const pathname = usePathname();

  if (channels.length === 0) {
    return (
      <div className="px-2 py-8 text-center text-sm text-muted-foreground">
        No channels yet.
        <br />
        Create one to get started.
      </div>
    );
  }

  return (
    <ul className="space-y-0.5">
      {channels.map((channel) => {
        const isActive = pathname === `/channels/${channel.id}`;
        return (
          <li key={channel.id} className="group relative">
            <Link
              href={`/channels/${channel.id}`}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent",
                isActive && "bg-accent font-medium",
              )}
            >
              <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{channel.name}</span>
            </Link>
            <div className="absolute top-0.5 right-1 hidden group-hover:block">
              <ChannelActions channel={channel} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
