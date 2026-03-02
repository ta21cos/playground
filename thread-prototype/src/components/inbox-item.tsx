"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { deleteStock } from "@/app/actions/stocks";

type InboxItemData = {
  id: string;
  title: string;
  content: string;
  sourceMessageIds: string;
  sourceChannelId: number | null;
  channelName: string | null;
  createdAt: string;
};

function formatDate(isoString: string) {
  const date = new Date(isoString + "Z");
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function InboxItem({
  item,
  selected,
  selectionMode,
  onToggleSelect,
}: {
  item: InboxItemData;
  selected: boolean;
  selectionMode: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const sourceIds = JSON.parse(item.sourceMessageIds) as string[];
  const firstMessageId = sourceIds[0] ?? null;

  const handleDelete = () => {
    startTransition(async () => {
      await deleteStock(item.id);
    });
  };

  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        selected ? "border-primary/40 bg-primary/5" : "hover:bg-muted/30"
      }`}
    >
      <div className="flex items-start gap-3">
        {selectionMode && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(item.id)}
            className="mt-1 shrink-0 rounded"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium">{item.title}</h3>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatDate(item.createdAt)}
            </span>
          </div>

          {item.channelName && firstMessageId && (
            <Link
              href={`/channels/${item.sourceChannelId}?highlight=${firstMessageId}`}
              className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />#{item.channelName}
            </Link>
          )}

          <div className="mt-2 line-clamp-3 text-sm text-muted-foreground">
            <MarkdownRenderer content={item.content} />
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
          onClick={handleDelete}
          disabled={isPending}
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
