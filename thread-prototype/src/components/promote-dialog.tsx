"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  promoteMessage,
  promoteThread,
  promoteMultiple,
} from "@/app/actions/stocks";

type PromoteMode =
  | { type: "single"; messageId: string; content: string; hasThread: boolean }
  | { type: "multiple"; messageIds: string[]; firstContent: string };

export function PromoteDialog({
  open,
  onOpenChange,
  mode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: PromoteMode;
}) {
  const defaultTitle =
    mode.type === "single"
      ? mode.content.slice(0, 30)
      : mode.firstContent.slice(0, 30);
  const [title, setTitle] = useState(defaultTitle);
  const [includeThread, setIncludeThread] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handlePromote = () => {
    startTransition(async () => {
      if (mode.type === "single") {
        if (includeThread && mode.hasThread) {
          await promoteThread(mode.messageId, title);
        } else {
          await promoteMessage(mode.messageId, title);
        }
      } else {
        await promoteMultiple(mode.messageIds, title);
      }
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Promote to Inbox</DialogTitle>
          <DialogDescription>
            {mode.type === "single"
              ? "Save this message to your inbox for later."
              : `Save ${mode.messageIds.length} messages to your inbox.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="promote-title">Title</Label>
            <Input
              id="promote-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title..."
              autoFocus
            />
          </div>
          {mode.type === "single" && mode.hasThread && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeThread}
                onChange={(e) => setIncludeThread(e.target.checked)}
                className="rounded"
              />
              Include thread replies
            </label>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handlePromote} disabled={isPending || !title.trim()}>
            {isPending ? "Promoting..." : "Promote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
