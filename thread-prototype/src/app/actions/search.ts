"use server";

import { getSqlite } from "@/db";

export type SearchResult = {
  message_id: string;
  channel_id: number;
  snippet: string;
  created_at: string;
  channel_name: string;
};

export async function searchMessages(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const sqlite = getSqlite();
  const results = sqlite
    .prepare(
      `
    SELECT
      f.message_id,
      f.channel_id,
      snippet(messages_fts, 0, '<mark>', '</mark>', '...', 32) as snippet,
      m.created_at,
      c.name as channel_name
    FROM messages_fts f
    JOIN messages m ON f.message_id = m.id
    JOIN channels c ON f.channel_id = c.id
    WHERE messages_fts MATCH ?
    ORDER BY rank
    LIMIT 20
  `,
    )
    .all(trimmed) as SearchResult[];

  return results;
}

export type CalendarDayCount = {
  day: string;
  count: number;
};

export async function getMessageCountsByDay(
  channelId: number,
  yearMonth: string,
): Promise<CalendarDayCount[]> {
  const sqlite = getSqlite();
  const startDate = `${yearMonth}-01`;
  const [year, month] = yearMonth.split("-").map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  const results = sqlite
    .prepare(
      `
    SELECT DATE(created_at) as day, COUNT(*) as count
    FROM messages
    WHERE channel_id = ? AND created_at >= ? AND created_at < ?
    GROUP BY day
  `,
    )
    .all(channelId, startDate, endDate) as CalendarDayCount[];

  return results;
}
