"use server";

import { db } from "@/db";
import { reactions } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";

export async function getReactionsForMessages(messageIds: string[]) {
  if (messageIds.length === 0) return {};

  const rows = db
    .select()
    .from(reactions)
    .where(
      sql`${reactions.messageId} IN (${sql.join(
        messageIds.map((id) => sql`${id}`),
        sql`,`,
      )})`,
    )
    .all();

  const grouped: Record<string, { id: string; emoji: string }[]> = {};
  for (const row of rows) {
    if (!grouped[row.messageId]) {
      grouped[row.messageId] = [];
    }
    grouped[row.messageId].push({ id: row.id, emoji: row.emoji });
  }
  return grouped;
}

export async function toggleReaction(
  messageId: string,
  emoji: string,
  channelId: number,
) {
  const existing = db
    .select()
    .from(reactions)
    .where(and(eq(reactions.messageId, messageId), eq(reactions.emoji, emoji)))
    .get();

  if (existing) {
    await db.delete(reactions).where(eq(reactions.id, existing.id));
  } else {
    const id = nanoid();
    await db.insert(reactions).values({ id, messageId, emoji });
  }

  revalidatePath(`/channels/${channelId}`);
  return { success: true };
}
