"use server";

import { db } from "@/db";
import {
  stocks,
  stockTags,
  messages,
  threadMessages,
  channels,
} from "@/db/schema";
import { eq, sql, asc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";

export async function getNotes() {
  return db
    .select()
    .from(stocks)
    .where(eq(stocks.status, "note"))
    .orderBy(stocks.updatedAt);
}

export async function getNoteById(id: string) {
  const result = await db
    .select()
    .from(stocks)
    .where(eq(stocks.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function getNoteTags(stockId: string) {
  return db.select().from(stockTags).where(eq(stockTags.stockId, stockId));
}

export async function createNote(formData: FormData) {
  const title = (formData.get("title") as string)?.trim();
  const content = (formData.get("content") as string) ?? "";
  const group = (formData.get("group") as string)?.trim() || null;
  const tagsRaw = formData.get("tags") as string;

  if (!title) {
    return { error: "Title is required" };
  }

  const id = nanoid();
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);

  await db.insert(stocks).values({
    id,
    status: "note",
    title,
    content,
    group,
    sourceMessageIds: "[]",
    createdAt: now,
    updatedAt: now,
  });

  if (tagsRaw) {
    const tags = JSON.parse(tagsRaw) as string[];
    for (const tag of tags) {
      const normalized = tag.toLowerCase().trim();
      if (normalized) {
        await db.insert(stockTags).values({
          id: nanoid(),
          stockId: id,
          tag: normalized,
        });
      }
    }
  }

  revalidatePath("/notes");
  revalidatePath("/");
  return { success: true, id };
}

export async function updateNote(id: string, formData: FormData) {
  const title = (formData.get("title") as string)?.trim();
  const content = (formData.get("content") as string) ?? "";
  const group = (formData.get("group") as string)?.trim() || null;
  const tagsRaw = formData.get("tags") as string;

  if (!title) {
    return { error: "Title is required" };
  }

  await db
    .update(stocks)
    .set({
      title,
      content,
      group,
      updatedAt: sql`datetime('now')`,
    })
    .where(eq(stocks.id, id));

  if (tagsRaw !== null && tagsRaw !== undefined) {
    await db.delete(stockTags).where(eq(stockTags.stockId, id));

    const tags = JSON.parse(tagsRaw) as string[];
    for (const tag of tags) {
      const normalized = tag.toLowerCase().trim();
      if (normalized) {
        await db.insert(stockTags).values({
          id: nanoid(),
          stockId: id,
          tag: normalized,
        });
      }
    }
  }

  revalidatePath("/notes");
  revalidatePath(`/notes/${id}`);
  revalidatePath("/");
  return { success: true };
}

export async function deleteNote(id: string) {
  await db.delete(stocks).where(eq(stocks.id, id));
  revalidatePath("/notes");
  revalidatePath("/");
  return { success: true };
}

export async function getGroups() {
  const results = await db
    .select({ group: stocks.group })
    .from(stocks)
    .where(eq(stocks.status, "note"))
    .groupBy(stocks.group);
  return results
    .map((r) => r.group)
    .filter((g): g is string => g !== null && g !== "");
}

export async function getAllTags() {
  const results = await db
    .select({ tag: stockTags.tag })
    .from(stockTags)
    .groupBy(stockTags.tag)
    .orderBy(stockTags.tag);
  return results.map((r) => r.tag);
}

function revalidateAll() {
  revalidatePath("/", "layout");
}

export async function promoteMessage(messageId: string, title?: string) {
  const msg = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId))
    .get();
  if (!msg) return { error: "Message not found" };
  if (msg.isPromoted) return { error: "Already promoted" };

  const id = nanoid();
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);
  const finalTitle = title?.trim() || msg.content.slice(0, 30);

  await db.insert(stocks).values({
    id,
    status: "inbox",
    title: finalTitle,
    content: msg.content,
    sourceMessageIds: JSON.stringify([messageId]),
    sourceChannelId: msg.channelId,
    createdAt: now,
    updatedAt: now,
  });

  await db
    .update(messages)
    .set({ isPromoted: 1 })
    .where(eq(messages.id, messageId));

  revalidateAll();
  return { success: true, id };
}

export async function promoteThread(messageId: string, title?: string) {
  const msg = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId))
    .get();
  if (!msg) return { error: "Message not found" };
  if (msg.isPromoted) return { error: "Already promoted" };

  const replies = await db
    .select()
    .from(threadMessages)
    .where(eq(threadMessages.messageId, messageId))
    .orderBy(asc(threadMessages.createdAt));

  const allIds = [messageId, ...replies.map((r) => r.id)];
  const contentParts = [msg.content, ...replies.map((r) => r.content)];

  const id = nanoid();
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);
  const finalTitle = title?.trim() || msg.content.slice(0, 30);

  await db.insert(stocks).values({
    id,
    status: "inbox",
    title: finalTitle,
    content: contentParts.join("\n\n---\n\n"),
    sourceMessageIds: JSON.stringify(allIds),
    sourceChannelId: msg.channelId,
    createdAt: now,
    updatedAt: now,
  });

  await db
    .update(messages)
    .set({ isPromoted: 1 })
    .where(eq(messages.id, messageId));

  revalidateAll();
  return { success: true, id };
}

export async function promoteMultiple(messageIds: string[], title?: string) {
  if (messageIds.length === 0) return { error: "No messages selected" };

  const msgs = await db
    .select()
    .from(messages)
    .where(
      sql`${messages.id} IN (${sql.join(
        messageIds.map((id) => sql`${id}`),
        sql`,`,
      )})`,
    )
    .orderBy(asc(messages.createdAt));

  const unpromotedMsgs = msgs.filter((m) => !m.isPromoted);
  if (unpromotedMsgs.length === 0)
    return { error: "All messages already promoted" };

  const contentParts = unpromotedMsgs.map((m) => m.content);
  const ids = unpromotedMsgs.map((m) => m.id);
  const channelId = unpromotedMsgs[0].channelId;

  const id = nanoid();
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);
  const finalTitle = title?.trim() || unpromotedMsgs[0].content.slice(0, 30);

  await db.insert(stocks).values({
    id,
    status: "inbox",
    title: finalTitle,
    content: contentParts.join("\n\n---\n\n"),
    sourceMessageIds: JSON.stringify(ids),
    sourceChannelId: channelId,
    createdAt: now,
    updatedAt: now,
  });

  for (const msgId of ids) {
    await db
      .update(messages)
      .set({ isPromoted: 1 })
      .where(eq(messages.id, msgId));
  }

  revalidateAll();
  return { success: true, id };
}

export async function getInboxItems() {
  const items = await db
    .select({
      id: stocks.id,
      status: stocks.status,
      title: stocks.title,
      content: stocks.content,
      group: stocks.group,
      sourceMessageIds: stocks.sourceMessageIds,
      sourceChannelId: stocks.sourceChannelId,
      createdAt: stocks.createdAt,
      updatedAt: stocks.updatedAt,
    })
    .from(stocks)
    .where(eq(stocks.status, "inbox"))
    .orderBy(stocks.createdAt);

  const channelIds = [
    ...new Set(items.map((i) => i.sourceChannelId).filter(Boolean)),
  ] as number[];
  let channelMap: Record<number, string> = {};
  if (channelIds.length > 0) {
    const chs = await db
      .select({ id: channels.id, name: channels.name })
      .from(channels)
      .where(
        sql`${channels.id} IN (${sql.join(
          channelIds.map((id) => sql`${id}`),
          sql`,`,
        )})`,
      );
    channelMap = Object.fromEntries(chs.map((c) => [c.id, c.name]));
  }

  return items.map((item) => ({
    ...item,
    channelName: item.sourceChannelId
      ? (channelMap[item.sourceChannelId] ?? null)
      : null,
  }));
}

export async function getInboxCount() {
  const result = db
    .select({ count: sql<number>`count(*)` })
    .from(stocks)
    .where(eq(stocks.status, "inbox"))
    .get();
  return result?.count ?? 0;
}

export async function deleteStock(id: string) {
  const stock = await db.select().from(stocks).where(eq(stocks.id, id)).get();
  if (!stock) return { error: "Stock not found" };

  const sourceIds = JSON.parse(stock.sourceMessageIds) as string[];
  if (sourceIds.length > 0) {
    for (const msgId of sourceIds) {
      await db
        .update(messages)
        .set({ isPromoted: 0 })
        .where(eq(messages.id, msgId));
    }
  }

  await db.delete(stocks).where(eq(stocks.id, id));
  revalidateAll();
  return { success: true };
}

export async function moveToNote(
  stockId: string,
  group?: string,
  tags?: string[],
) {
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);

  await db
    .update(stocks)
    .set({
      status: "note",
      group: group?.trim() || null,
      updatedAt: now,
    })
    .where(eq(stocks.id, stockId));

  if (tags && tags.length > 0) {
    for (const tag of tags) {
      const normalized = tag.toLowerCase().trim();
      if (normalized) {
        await db
          .insert(stockTags)
          .values({ id: nanoid(), stockId, tag: normalized })
          .onConflictDoNothing();
      }
    }
  }

  revalidateAll();
  return { success: true };
}

export async function mergeIntoNote(stockId: string, targetNoteId: string) {
  const source = db.select().from(stocks).where(eq(stocks.id, stockId)).get();
  const target = db
    .select()
    .from(stocks)
    .where(eq(stocks.id, targetNoteId))
    .get();

  if (!source) return { error: "Source stock not found" };
  if (!target) return { error: "Target note not found" };

  const mergedContent = target.content
    ? `${target.content}\n\n---\n\n${source.content}`
    : source.content;

  const targetSourceIds = JSON.parse(target.sourceMessageIds) as string[];
  const sourceSourceIds = JSON.parse(source.sourceMessageIds) as string[];
  const mergedSourceIds = [...targetSourceIds, ...sourceSourceIds];

  await db
    .update(stocks)
    .set({
      content: mergedContent,
      sourceMessageIds: JSON.stringify(mergedSourceIds),
      updatedAt: sql`datetime('now')`,
    })
    .where(eq(stocks.id, targetNoteId));

  await db.delete(stocks).where(eq(stocks.id, stockId));

  revalidateAll();
  return { success: true };
}

export async function moveMultipleToNote(
  ids: string[],
  group?: string,
  tags?: string[],
) {
  if (ids.length === 0) return { error: "No items selected" };
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);

  for (const stockId of ids) {
    await db
      .update(stocks)
      .set({
        status: "note",
        group: group?.trim() || null,
        updatedAt: now,
      })
      .where(eq(stocks.id, stockId));

    if (tags && tags.length > 0) {
      for (const tag of tags) {
        const normalized = tag.toLowerCase().trim();
        if (normalized) {
          await db
            .insert(stockTags)
            .values({ id: nanoid(), stockId, tag: normalized })
            .onConflictDoNothing();
        }
      }
    }
  }

  revalidateAll();
  return { success: true };
}
