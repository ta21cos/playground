"use client";

import { useEffect, useRef } from "react";
import { MessageItem } from "@/components/message-item";
import { MessageCircle } from "lucide-react";
import type { Message } from "@/db/schema";

export function MessageList({
  messages,
  threadReplyCounts,
  reactionsByMessage,
  highlightMessageId,
}: {
  messages: Message[];
  threadReplyCounts?: Record<string, number>;
  reactionsByMessage?: Record<string, { id: string; emoji: string }[]>;
  highlightMessageId?: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlightMessageId) {
      const el = document.getElementById(`msg-${highlightMessageId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, highlightMessageId]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
        <MessageCircle className="h-10 w-10" />
        <p className="text-sm">No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="mt-auto flex flex-col gap-1 py-4">
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            threadReplyCount={threadReplyCounts?.[message.id]}
            reactions={reactionsByMessage?.[message.id]}
            highlight={message.id === highlightMessageId}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
