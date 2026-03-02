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

export type StockSearchResult = {
  stock_id: string;
  status: string;
  title: string;
  snippet: string;
  group_name: string | null;
  tags: string;
  created_at: string;
};

export async function searchStocks(
  query: string,
  status?: string,
): Promise<StockSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const sqlite = getSqlite();
  const statusFilter = status ? "AND f.status = ?" : "";
  const params: string[] = status ? [trimmed, status] : [trimmed];

  const results = sqlite
    .prepare(
      `
    SELECT
      f.stock_id,
      f.status,
      s.title,
      snippet(stocks_fts, 1, '<mark>', '</mark>', '...', 32) as snippet,
      s."group" as group_name,
      COALESCE(
        (SELECT GROUP_CONCAT(st.tag, ', ') FROM stock_tags st WHERE st.stock_id = s.id),
        ''
      ) as tags,
      s.created_at
    FROM stocks_fts f
    JOIN stocks s ON f.stock_id = s.id
    WHERE stocks_fts MATCH ?
    ${statusFilter}
    ORDER BY rank
    LIMIT 20
  `,
    )
    .all(...params) as StockSearchResult[];

  return results;
}

export type UnifiedSearchResult = {
  type: "message" | "stock";
  id: string;
  snippet: string;
  created_at: string;
  channel_id: number | null;
  channel_name: string | null;
  stock_id: string | null;
  status: string | null;
  title: string | null;
  group_name: string | null;
  tags: string | null;
};

export async function searchAll(query: string): Promise<UnifiedSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const sqlite = getSqlite();
  const results = sqlite
    .prepare(
      `
    SELECT * FROM (
      SELECT
        'message' as type,
        m.id as id,
        snippet(messages_fts, 0, '<mark>', '</mark>', '...', 32) as snippet,
        m.created_at,
        mf.channel_id,
        c.name as channel_name,
        NULL as stock_id,
        NULL as status,
        NULL as title,
        NULL as group_name,
        NULL as tags
      FROM messages_fts mf
      JOIN messages m ON mf.message_id = m.id
      JOIN channels c ON mf.channel_id = c.id
      WHERE messages_fts MATCH ?
      ORDER BY rank
      LIMIT 20
    )

    UNION ALL

    SELECT * FROM (
      SELECT
        'stock' as type,
        s.id as id,
        snippet(stocks_fts, 1, '<mark>', '</mark>', '...', 32) as snippet,
        s.created_at,
        NULL as channel_id,
        NULL as channel_name,
        sf.stock_id,
        sf.status,
        s.title,
        s."group" as group_name,
        COALESCE(
          (SELECT GROUP_CONCAT(st.tag, ', ') FROM stock_tags st WHERE st.stock_id = s.id),
          ''
        ) as tags
      FROM stocks_fts sf
      JOIN stocks s ON sf.stock_id = s.id
      WHERE stocks_fts MATCH ?
      ORDER BY rank
      LIMIT 20
    )
  `,
    )
    .all(trimmed, trimmed) as UnifiedSearchResult[];

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
