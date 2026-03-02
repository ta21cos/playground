"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageItem } from "@/components/message-item";
import { PromoteDialog } from "@/components/promote-dialog";
import { MessageCircle, CheckSquare, Pin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [promoteDialog, setPromoteDialog] = useState<{
    open: boolean;
    mode:
      | {
          type: "single";
          messageId: string;
          content: string;
          hasThread: boolean;
        }
      | { type: "multiple"; messageIds: string[]; firstContent: string };
  }>({
    open: false,
    mode: { type: "multiple", messageIds: [], firstContent: "" },
  });

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

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleToggleSelectionMode = () => {
    setSelectionMode((prev) => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  };

  const handlePromoteSingle = (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;
    setPromoteDialog({
      open: true,
      mode: {
        type: "single",
        messageId,
        content: msg.content,
        hasThread: (threadReplyCounts?.[messageId] ?? 0) > 0,
      },
    });
  };

  const handlePromoteSelected = () => {
    const ids = Array.from(selectedIds);
    const firstMsg = messages.find((m) => ids.includes(m.id));
    if (!firstMsg) return;
    setPromoteDialog({
      open: true,
      mode: {
        type: "multiple",
        messageIds: ids,
        firstContent: firstMsg.content,
      },
    });
  };

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
        <MessageCircle className="h-10 w-10" />
        <p className="text-sm">No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-y-auto">
      <div className="sticky top-0 z-10 flex items-center justify-end border-b bg-background/80 px-3 py-1 backdrop-blur-sm">
        <Button
          variant={selectionMode ? "secondary" : "ghost"}
          size="sm"
          onClick={handleToggleSelectionMode}
          className="h-7 gap-1 text-xs"
        >
          <CheckSquare className="h-3 w-3" />
          {selectionMode ? "Cancel Selection" : "Select"}
        </Button>
      </div>

      <div className="mt-auto flex flex-col gap-1 py-4">
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            threadReplyCount={threadReplyCounts?.[message.id]}
            reactions={reactionsByMessage?.[message.id]}
            highlight={message.id === highlightMessageId}
            selectionMode={selectionMode}
            selected={selectedIds.has(message.id)}
            onToggleSelect={toggleSelect}
            onPromote={handlePromoteSingle}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {selectionMode && selectedIds.size > 0 && (
        <div className="sticky bottom-0 flex items-center justify-between border-t bg-background px-4 py-2 shadow-md">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} selected
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedIds(new Set());
                setSelectionMode(false);
              }}
            >
              <X className="mr-1 h-3 w-3" />
              Clear
            </Button>
            <Button size="sm" onClick={handlePromoteSelected}>
              <Pin className="mr-1 h-3 w-3" />
              Promote {selectedIds.size}
            </Button>
          </div>
        </div>
      )}

      <PromoteDialog
        open={promoteDialog.open}
        onOpenChange={(open) => setPromoteDialog((prev) => ({ ...prev, open }))}
        mode={promoteDialog.mode}
      />
    </div>
  );
}
