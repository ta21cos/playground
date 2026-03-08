"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Pencil,
  Trash2,
  Check,
  X,
  MessageSquare,
  SmilePlus,
  Pin,
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
  highlight,
  selectionMode,
  selected,
  onToggleSelect,
  onPromote,
}: {
  message: Message;
  threadReplyCount?: number;
  reactions?: { id: string; emoji: string }[];
  highlight?: boolean;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  onPromote?: (messageId: string) => void;
}) {
  const highlightRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (highlight && highlightRef.current) {
      const el = highlightRef.current;
      el.classList.add("bg-yellow-100", "dark:bg-yellow-900/30");
      const timer = setTimeout(() => {
        el.classList.remove("bg-yellow-100", "dark:bg-yellow-900/30");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [highlight]);
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
    <div
      ref={highlightRef}
      id={`msg-${message.id}`}
      className={`group relative cursor-pointer border-b border-border/50 px-3 py-3 transition-colors duration-1000 hover:bg-muted/50 ${
        selected ? "bg-primary/5 ring-1 ring-primary/20" : ""
      }`}
      onClick={!editing ? handleOpenThread : undefined}
    >
      <div className="flex items-baseline gap-2">
        {selectionMode && (
          <input
            type="checkbox"
            checked={selected ?? false}
            onChange={() => onToggleSelect?.(message.id)}
            onClick={(e) => e.stopPropagation()}
            className="mt-0.5 shrink-0 rounded"
          />
        )}
        <span className="text-xs font-medium text-muted-foreground">
          {formatTimestamp(message.createdAt)}
        </span>
        {isEdited && (
          <span className="text-xs italic text-muted-foreground">(edited)</span>
        )}
        {message.isPromoted === 1 && (
          <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            <Pin className="h-2.5 w-2.5" />
            promoted
          </span>
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
        <div
          className="mt-1 flex flex-wrap gap-1"
          onClick={(e) => e.stopPropagation()}
        >
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
        <div
          className="absolute -top-2 right-2 hidden gap-0.5 rounded-md border bg-background p-0.5 shadow-sm group-hover:flex"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleOpenThread}
            aria-label="Reply in thread"
            title="Reply in thread"
          >
            <MessageSquare className="h-3 w-3" />
          </Button>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              aria-label="Add reaction"
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
          {!message.isPromoted && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onPromote?.(message.id)}
              aria-label="Promote to inbox"
              title="Promote to inbox"
            >
              <Pin className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => {
              setEditContent(message.content);
              setEditing(true);
            }}
            aria-label="Edit message"
            title="Edit message"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={deleting}
            aria-label="Delete message"
            title="Delete message"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
