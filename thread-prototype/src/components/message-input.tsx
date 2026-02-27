"use client";

import { useState, useRef, useCallback } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createMessage } from "@/app/actions/messages";
import {
  useEmojiSuggest,
  EmojiSuggestPopover,
} from "@/components/emoji-suggest";

export function MessageInput({ channelId }: { channelId: number }) {
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
    await createMessage(channelId, trimmed);
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
          placeholder="Write a message… (Cmd+Enter to send)"
          className="min-h-[44px] resize-none"
          rows={1}
          disabled={sending}
        />
        <Button
          size="icon"
          onClick={handleSubmit}
          disabled={!content.trim() || sending}
          className="shrink-0 self-end"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Markdown supported. Press Cmd+Enter to send. Type :emoji for
        suggestions.
      </p>
    </div>
  );
}
