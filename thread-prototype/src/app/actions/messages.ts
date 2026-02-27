"use server";

import { db } from "@/db";
import { messages } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";

export async function getMessages(channelId: number) {
  return db
    .select()
    .from(messages)
    .where(eq(messages.channelId, channelId))
    .orderBy(asc(messages.createdAt));
}

export async function createMessage(channelId: number, content: string) {
  const trimmed = content.trim();
  if (!trimmed) {
    return { error: "Message content is required" };
  }

  const id = nanoid();
  await db.insert(messages).values({
    id,
    channelId,
    content: trimmed,
  });

  revalidatePath(`/channels/${channelId}`);
  return { success: true, id };
}

export async function updateMessage(
  messageId: string,
  channelId: number,
  content: string,
) {
  const trimmed = content.trim();
  if (!trimmed) {
    return { error: "Message content is required" };
  }

  await db
    .update(messages)
    .set({ content: trimmed, updatedAt: sql`datetime('now')` })
    .where(and(eq(messages.id, messageId), eq(messages.channelId, channelId)));

  revalidatePath(`/channels/${channelId}`);
  return { success: true };
}

export async function deleteMessage(messageId: string, channelId: number) {
  await db
    .delete(messages)
    .where(and(eq(messages.id, messageId), eq(messages.channelId, channelId)));

  revalidatePath(`/channels/${channelId}`);
  return { success: true };
}
