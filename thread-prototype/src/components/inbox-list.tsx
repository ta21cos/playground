"use client";

import { useCallback, useState } from "react";
import { Inbox, CheckSquare, FileOutput, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InboxItem } from "@/components/inbox-item";
import { MoveToNoteModal } from "@/components/move-to-note-modal";
import type { Stock } from "@/db/schema";

type InboxItemData = {
  id: string;
  status: string;
  title: string;
  content: string;
  group: string | null;
  sourceMessageIds: string;
  sourceChannelId: number | null;
  createdAt: string;
  updatedAt: string;
  channelName: string | null;
};

export function InboxList({
  items,
  existingNotes,
}: {
  items: InboxItemData[];
  existingNotes: Stock[];
}) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [moveTargetIds, setMoveTargetIds] = useState<string[]>([]);

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

  const handleMoveToNote = (stockIds: string[]) => {
    setMoveTargetIds(stockIds);
    setMoveModalOpen(true);
  };

  const handleBulkMove = () => {
    handleMoveToNote(Array.from(selectedIds));
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <Inbox className="h-10 w-10" />
        <p className="text-sm">Your inbox is empty.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
        <Button
          variant={selectionMode ? "secondary" : "ghost"}
          size="xs"
          onClick={handleToggleSelectionMode}
        >
          <CheckSquare className="h-3 w-3" />
          {selectionMode ? "Cancel" : "Select"}
        </Button>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="relative">
            <InboxItem
              item={item}
              selected={selectedIds.has(item.id)}
              selectionMode={selectionMode}
              onToggleSelect={toggleSelect}
            />
            {!selectionMode && (
              <div className="absolute right-12 top-4">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => handleMoveToNote([item.id])}
                  aria-label="Move to note"
                  title="Move to note"
                >
                  <FileOutput className="h-3 w-3" />
                  To Note
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {selectionMode && selectedIds.size > 0 && (
        <div className="sticky bottom-0 mt-4 flex items-center justify-between rounded-lg border bg-background px-4 py-2 shadow-md">
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
            <Button size="sm" onClick={handleBulkMove}>
              <FileOutput className="mr-1 h-3 w-3" />
              Move {selectedIds.size} to Note
            </Button>
          </div>
        </div>
      )}

      <MoveToNoteModal
        open={moveModalOpen}
        onOpenChange={setMoveModalOpen}
        stockIds={moveTargetIds}
        existingNotes={existingNotes}
      />
    </div>
  );
}
