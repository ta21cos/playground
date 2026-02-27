"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { deleteChannel, updateChannel } from "@/app/actions/channels";
import type { Channel } from "@/db/schema";

export function ChannelActions({ channel }: { channel: Channel }) {
  const [showMenu, setShowMenu] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.preventDefault();
            setShowMenu((prev) => !prev);
          }}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
        {showMenu && (
          <div className="absolute right-0 z-50 mt-1 w-36 rounded-md border bg-popover p-1 shadow-md">
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              onClick={(e) => {
                e.preventDefault();
                setShowMenu(false);
                setEditOpen(true);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-accent"
              onClick={(e) => {
                e.preventDefault();
                setShowMenu(false);
                setDeleteOpen(true);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        )}
      </div>

      <EditChannelDialog
        channel={channel}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteChannelDialog
        channel={channel}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}

function EditChannelDialog({
  channel,
  open,
  onOpenChange,
}: {
  channel: Channel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const handleSubmit = async (formData: FormData) => {
    const result = await updateChannel(channel.id, formData);
    if (result.success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Channel</DialogTitle>
          <DialogDescription>
            Update the channel name and description.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                name="name"
                defaultValue={channel.name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                name="description"
                defaultValue={channel.description ?? ""}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteChannelDialog({
  channel,
  open,
  onOpenChange,
}: {
  channel: Channel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const handleDelete = async () => {
    await deleteChannel(channel.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Channel</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{channel.name}&quot;? This
            action cannot be undone and all related data will be permanently
            removed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
