"use client";

import { useState } from "react";
import Link from "next/link";
import { Inbox, Menu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ChannelList } from "./channel-list";
import { CreateChannelDialog } from "./create-channel-dialog";
import { SidebarNotes } from "./sidebar-notes";
import type { Channel, Stock } from "@/db/schema";

export function MobileSidebar({
  channels,
  notes,
  inboxCount,
}: {
  channels: Channel[];
  notes: Stock[];
  inboxCount: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 overflow-auto p-0">
        <SheetHeader className="border-b px-4 py-4">
          <SheetTitle>Threads</SheetTitle>
        </SheetHeader>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium text-muted-foreground">
            Channels
          </span>
          <CreateChannelDialog />
        </div>
        <nav className="px-2">
          <ChannelList channels={channels} onNavigate={() => setOpen(false)} />
        </nav>

        <div className="px-2 py-1">
          <Link
            href="/inbox"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent"
          >
            <Inbox className="h-4 w-4" />
            Inbox
            {inboxCount > 0 && (
              <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                {inboxCount}
              </span>
            )}
          </Link>
        </div>

        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium text-muted-foreground">
            Notes
          </span>
          <Link
            href="/notes/new"
            onClick={() => setOpen(false)}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
          </Link>
        </div>
        <nav className="px-2 pb-4">
          <Link
            href="/notes"
            onClick={() => setOpen(false)}
            className="mb-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent"
          >
            All Notes
          </Link>
          <SidebarNotes notes={notes} onNavigate={() => setOpen(false)} />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
