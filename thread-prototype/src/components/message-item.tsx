"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Pencil,
  Trash2,
  Check,
  X,
  MessageSquare,
  SmilePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { EmojiPicker } from "@/components/emoji-picker";
import { updateMessage, deleteMessage } from "@/app/actions/messages";
import { toggleReaction } from "@/app/actions/reactions";
import type { Message } from "@/db/schema";

function formatTimestamp(isoString: string) {
  const date = new Date(isoString + "Z");
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessageItem({
  message,
  threadReplyCount,
  reactions,
}: {
  message: Message;
  threadReplyCount?: number;
  reactions?: { id: string; emoji: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [deleting, setDeleting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const isEdited = message.createdAt !== message.updatedAt;

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    await updateMessage(message.id, message.channelId, editContent);
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setEditing(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await deleteMessage(message.id, message.channelId);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSaveEdit();
    }
    if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const handleOpenThread = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("thread", message.id);
    router.push(`?${params.toString()}`);
  };

  const handleReactionSelect = async (emoji: string) => {
    setShowEmojiPicker(false);
    await toggleReaction(message.id, emoji, message.channelId);
  };

  const handleReactionClick = async (emoji: string) => {
    await toggleReaction(message.id, emoji, message.channelId);
  };

  return (
    <div className="group relative rounded-md px-3 py-2 hover:bg-muted/50">
      <div className="flex items-baseline gap-2">
        <span className="text-xs text-muted-foreground">
          {formatTimestamp(message.createdAt)}
        </span>
        {isEdited && (
          <span className="text-xs italic text-muted-foreground">(edited)</span>
        )}
      </div>

      {editing ? (
        <div className="mt-1 space-y-2">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={handleEditKeyDown}
            className="min-h-[60px]"
            autoFocus
          />
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
              <Check className="mr-1 h-3 w-3" />
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
              <X className="mr-1 h-3 w-3" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-0.5">
          <MarkdownRenderer content={message.content} />
        </div>
      )}

      {reactions && reactions.length > 0 && !editing && (
        <div className="mt-1 flex flex-wrap gap-1">
          {reactions.map((r) => (
            <button
              key={r.id}
              onClick={() => handleReactionClick(r.emoji)}
              className="inline-flex items-center rounded-full border px-2 py-0.5 text-sm transition-colors hover:bg-muted"
            >
              {r.emoji}
            </button>
          ))}
        </div>
      )}

      {threadReplyCount !== undefined && threadReplyCount > 0 && !editing && (
        <button
          onClick={handleOpenThread}
          className="mt-1 text-xs font-medium text-primary hover:underline"
        >
          {threadReplyCount} {threadReplyCount === 1 ? "reply" : "replies"}
        </button>
      )}

      {!editing && (
        <div className="absolute -top-2 right-2 hidden gap-0.5 rounded-md border bg-background p-0.5 shadow-sm group-hover:flex">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleOpenThread}
            title="Reply in thread"
          >
            <MessageSquare className="h-3 w-3" />
          </Button>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Add reaction"
            >
              <SmilePlus className="h-3 w-3" />
            </Button>
            {showEmojiPicker && (
              <div className="absolute right-0 top-full z-50 mt-1">
                <EmojiPicker
                  onSelect={handleReactionSelect}
                  onClose={() => setShowEmojiPicker(false)}
                />
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => {
              setEditContent(message.content);
              setEditing(true);
            }}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
