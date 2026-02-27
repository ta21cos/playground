"use server";

import { db } from "@/db";
import { threadMessages, messages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";

export async function getThreadReplies(messageId: string) {
  return db
    .select()
    .from(threadMessages)
    .where(eq(threadMessages.messageId, messageId))
    .orderBy(asc(threadMessages.createdAt));
}

export async function getThreadReplyCount(messageId: string) {
  const result = db
    .select({ count: sql<number>`count(*)` })
    .from(threadMessages)
    .where(eq(threadMessages.messageId, messageId))
    .get();
  return result?.count ?? 0;
}

export async function getThreadReplyCounts(messageIds: string[]) {
  if (messageIds.length === 0) return {};

  const rows = db
    .select({
      messageId: threadMessages.messageId,
      count: sql<number>`count(*)`,
    })
    .from(threadMessages)
    .where(
      sql`${threadMessages.messageId} IN (${sql.join(
        messageIds.map((id) => sql`${id}`),
        sql`,`,
      )})`,
    )
    .groupBy(threadMessages.messageId)
    .all();

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.messageId] = row.count;
  }
  return counts;
}

export async function getParentMessage(messageId: string) {
  return db.select().from(messages).where(eq(messages.id, messageId)).get();
}

export async function createThreadReply(
  messageId: string,
  content: string,
  channelId: number,
) {
  const trimmed = content.trim();
  if (!trimmed) {
    return { error: "Reply content is required" };
  }

  const id = nanoid();
  await db.insert(threadMessages).values({
    id,
    messageId,
    content: trimmed,
  });

  revalidatePath(`/channels/${channelId}`);
  return { success: true, id };
}

export async function updateThreadReply(
  replyId: string,
  content: string,
  channelId: number,
) {
  const trimmed = content.trim();
  if (!trimmed) {
    return { error: "Reply content is required" };
  }

  await db
    .update(threadMessages)
    .set({ content: trimmed, updatedAt: sql`datetime('now')` })
    .where(eq(threadMessages.id, replyId));

  revalidatePath(`/channels/${channelId}`);
  return { success: true };
}

export async function deleteThreadReply(replyId: string, channelId: number) {
  await db.delete(threadMessages).where(eq(threadMessages.id, replyId));

  revalidatePath(`/channels/${channelId}`);
  return { success: true };
}
