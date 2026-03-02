import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

const DB_PATH = path.join(process.cwd(), "data", "local.db");

type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

declare const globalThis: {
  __db: DrizzleDB | undefined;
  __sqlite: InstanceType<typeof Database> | undefined;
} & typeof global;

function initDatabase(): {
  db: DrizzleDB;
  sqlite: InstanceType<typeof Database>;
} {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const sqlite = new Database(DB_PATH);

  sqlite.pragma("busy_timeout = 10000");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS thread_messages (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reactions (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      emoji TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(message_id, emoji)
    );

    CREATE TABLE IF NOT EXISTS stocks (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'inbox',
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      "group" TEXT,
      source_message_ids TEXT NOT NULL DEFAULT '[]',
      source_channel_id INTEGER REFERENCES channels(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stock_tags (
      id TEXT PRIMARY KEY,
      stock_id TEXT NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
      tag TEXT NOT NULL,
      UNIQUE(stock_id, tag)
    );
  `);

  const messageColumns = sqlite
    .prepare("PRAGMA table_info(messages)")
    .all() as { name: string }[];
  const hasIsPromoted = messageColumns.some(
    (col) => col.name === "is_promoted",
  );
  if (!hasIsPromoted) {
    sqlite.exec(
      "ALTER TABLE messages ADD COLUMN is_promoted INTEGER NOT NULL DEFAULT 0;",
    );
  }

  try {
    sqlite.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
        content,
        message_id UNINDEXED,
        channel_id UNINDEXED,
        tokenize='trigram'
      );

      CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
        INSERT INTO messages_fts(content, message_id, channel_id)
        VALUES (new.content, new.id, new.channel_id);
      END;

      CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
        DELETE FROM messages_fts WHERE message_id = old.id;
        INSERT INTO messages_fts(content, message_id, channel_id)
        VALUES (new.content, new.id, new.channel_id);
      END;

      CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
        DELETE FROM messages_fts WHERE message_id = old.id;
      END;
    `);

    sqlite.exec(`
      DELETE FROM messages_fts;
      INSERT INTO messages_fts(content, message_id, channel_id)
      SELECT content, id, channel_id FROM messages;
    `);

    sqlite.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS stocks_fts USING fts5(
        title,
        content,
        stock_id UNINDEXED,
        status UNINDEXED,
        tokenize='trigram'
      );

      CREATE TRIGGER IF NOT EXISTS stocks_ai AFTER INSERT ON stocks BEGIN
        INSERT INTO stocks_fts(title, content, stock_id, status)
        VALUES (new.title, new.content, new.id, new.status);
      END;

      CREATE TRIGGER IF NOT EXISTS stocks_au AFTER UPDATE ON stocks BEGIN
        DELETE FROM stocks_fts WHERE stock_id = old.id;
        INSERT INTO stocks_fts(title, content, stock_id, status)
        VALUES (new.title, new.content, new.id, new.status);
      END;

      CREATE TRIGGER IF NOT EXISTS stocks_ad AFTER DELETE ON stocks BEGIN
        DELETE FROM stocks_fts WHERE stock_id = old.id;
      END;
    `);

    sqlite.exec(`
      DELETE FROM stocks_fts;
      INSERT INTO stocks_fts(title, content, stock_id, status)
      SELECT title, content, id, status FROM stocks;
    `);
  } catch {
    // FTS setup may conflict with concurrent workers; non-fatal for startup
  }

  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
}

export function getDb(): DrizzleDB {
  if (!globalThis.__db) {
    const { db, sqlite } = initDatabase();
    globalThis.__db = db;
    globalThis.__sqlite = sqlite;
  }
  return globalThis.__db;
}

export function getSqlite(): InstanceType<typeof Database> {
  if (!globalThis.__sqlite) {
    const { db, sqlite } = initDatabase();
    globalThis.__db = db;
    globalThis.__sqlite = sqlite;
  }
  return globalThis.__sqlite;
}

// For backwards compatibility — lazy proxy that initializes on first access
export const db = new Proxy({} as DrizzleDB, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
