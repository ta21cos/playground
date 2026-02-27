"use server";

import { db } from "@/db";
import { channels } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getChannels() {
  return db.select().from(channels).orderBy(channels.name);
}

export async function getChannel(id: number) {
  const result = await db
    .select()
    .from(channels)
    .where(eq(channels.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createChannel(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? "";

  if (!name) {
    return { error: "Channel name is required" };
  }

  await db.insert(channels).values({ name, description });
  revalidatePath("/");
  return { success: true };
}

export async function updateChannel(id: number, formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? "";

  if (!name) {
    return { error: "Channel name is required" };
  }

  await db
    .update(channels)
    .set({ name, description, updatedAt: sql`datetime('now')` })
    .where(eq(channels.id, id));

  revalidatePath("/");
  return { success: true };
}

export async function deleteChannel(id: number) {
  await db.delete(channels).where(eq(channels.id, id));
  revalidatePath("/");
  return { success: true };
}
