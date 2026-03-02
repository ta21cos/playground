"use server";

import { db } from "@/db";
import { stocks, stockTags } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
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
