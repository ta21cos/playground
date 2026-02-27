"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
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
import type { Channel } from "@/db/schema";

export function MobileSidebar({ channels }: { channels: Channel[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b px-4 py-4">
          <SheetTitle>Threads</SheetTitle>
        </SheetHeader>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium text-muted-foreground">
            Channels
          </span>
          <CreateChannelDialog />
        </div>
        <nav className="overflow-auto px-2">
          <ChannelList channels={channels} onNavigate={() => setOpen(false)} />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
