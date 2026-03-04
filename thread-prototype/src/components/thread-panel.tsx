"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, Send, Pencil, Trash2, Check, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  getParentMessage,
  getThreadReplies,
  createThreadReply,
  updateThreadReply,
  deleteThreadReply,
} from "@/app/actions/threads";
import {
  useEmojiSuggest,
  EmojiSuggestPopover,
} from "@/components/emoji-suggest";
import type { Message, ThreadMessage } from "@/db/schema";

function formatTimestamp(isoString: string) {
  const date = new Date(isoString + "Z");
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ThreadReplyItem({
  reply,
  channelId,
}: {
  reply: ThreadMessage;
  channelId: number;
}) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);
  const [deleting, setDeleting] = useState(false);

  const isEdited = reply.createdAt !== reply.updatedAt;

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    await updateThreadReply(reply.id, editContent, channelId);
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(reply.content);
    setEditing(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await deleteThreadReply(reply.id, channelId);
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

  return (
    <div className="group relative rounded-md px-3 py-2 hover:bg-muted/50">
      <div className="flex items-baseline gap-2">
        <span className="text-xs text-muted-foreground">
          {formatTimestamp(reply.createdAt)}
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
          <MarkdownRenderer content={reply.content} />
        </div>
      )}

      {!editing && (
        <div className="absolute -top-2 right-2 hidden gap-0.5 rounded-md border bg-background p-0.5 shadow-sm group-hover:flex">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => {
              setEditContent(reply.content);
              setEditing(true);
            }}
            aria-label="Edit reply"
            title="Edit reply"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={deleting}
            aria-label="Delete reply"
            title="Delete reply"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

function ThreadReplyInput({
  messageId,
  channelId,
}: {
  messageId: string;
  channelId: number;
}) {
  const [content, setContent] = useState("");
  const [cursorPos, setCursorPos] = useState(0);
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInsertEmoji = useCallback(
    (before: string, emoji: string, after: string) => {
      const newContent = before + emoji + after;
      setContent(newContent);
      const newPos = before.length + emoji.length;
      setCursorPos(newPos);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = newPos;
          textareaRef.current.selectionEnd = newPos;
          textareaRef.current.focus();
        }
      }, 0);
    },
    [],
  );

  const {
    isOpen,
    suggestions,
    selectedIndex,
    handleKeyDown,
    selectSuggestion,
    handleChange: handleEmojiChange,
  } = useEmojiSuggest(content, cursorPos, handleInsertEmoji);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setContent("");
    await createThreadReply(messageId, trimmed, channelId);
    setSending(false);
    textareaRef.current?.focus();
  };

  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (handleKeyDown(e)) return;
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative border-t pt-3">
      {isOpen && (
        <EmojiSuggestPopover
          suggestions={suggestions}
          selectedIndex={selectedIndex}
          onSelect={selectSuggestion}
        />
      )}
      <div className="flex gap-2">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setCursorPos(e.target.selectionStart ?? 0);
            handleEmojiChange();
          }}
          onKeyDown={handleTextKeyDown}
          onSelect={(e) =>
            setCursorPos((e.target as HTMLTextAreaElement).selectionStart)
          }
          placeholder="Reply in thread… (Cmd+Enter to send)"
          className="min-h-[44px] resize-none"
          rows={1}
          disabled={sending}
        />
        <Button
          size="icon"
          onClick={handleSubmit}
          disabled={!content.trim() || sending}
          className="shrink-0 self-end"
          aria-label="Send reply"
          title="Send reply"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ThreadPanelContent({
  messageId,
  channelId,
  onClose,
}: {
  messageId: string;
  channelId: number;
  onClose: () => void;
}) {
  const [parentMessage, setParentMessage] = useState<Message | null>(null);
  const [replies, setReplies] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const [parent, threadReplies] = await Promise.all([
        getParentMessage(messageId),
        getThreadReplies(messageId),
      ]);
      if (!mounted) return;
      setParentMessage(parent ?? null);
      setReplies(threadReplies);
      setLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, [messageId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies.length]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading thread...
      </div>
    );
  }

  if (!parentMessage) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Message not found
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">Thread</h3>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onClose}
          aria-label="Close thread"
          title="Close thread"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="border-b px-4 py-3">
          <div className="text-xs text-muted-foreground">
            {formatTimestamp(parentMessage.createdAt)}
          </div>
          <div className="mt-1">
            <MarkdownRenderer content={parentMessage.content} />
          </div>
        </div>

        <div className="flex flex-col gap-1 p-2">
          {replies.length > 0 && (
            <p className="px-3 py-1 text-xs font-medium text-muted-foreground">
              {replies.length} {replies.length === 1 ? "reply" : "replies"}
            </p>
          )}
          {replies.map((reply) => (
            <ThreadReplyItem
              key={reply.id}
              reply={reply}
              channelId={channelId}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="p-4">
        <ThreadReplyInput messageId={messageId} channelId={channelId} />
      </div>
    </div>
  );
}

export function ThreadPanel({ channelId }: { channelId: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const threadId = searchParams.get("thread");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleClose = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("thread");
    const query = params.toString();
    router.push(query ? `?${query}` : `/channels/${channelId}`);
  };

  if (!threadId) return null;

  if (isMobile) {
    return (
      <Sheet open={!!threadId} onOpenChange={(open) => !open && handleClose()}>
        <SheetContent
          side="right"
          className="w-full p-0 sm:max-w-full"
          showCloseButton={false}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Thread</SheetTitle>
          </SheetHeader>
          <ThreadPanelContent
            messageId={threadId}
            channelId={channelId}
            onClose={handleClose}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="flex h-full w-96 shrink-0 flex-col border-l">
      <ThreadPanelContent
        messageId={threadId}
        channelId={channelId}
        onClose={handleClose}
      />
    </div>
  );
}
