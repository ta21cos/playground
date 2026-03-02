import { sqliteTable, text, integer, unique } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const channels = sqliteTable("channels", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").default(""),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Channel = typeof channels.$inferSelect;
export type NewChannel = typeof channels.$inferInsert;

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  channelId: integer("channel_id")
    .notNull()
    .references(() => channels.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  isPromoted: integer("is_promoted").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export const threadMessages = sqliteTable("thread_messages", {
  id: text("id").primaryKey(),
  messageId: text("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type ThreadMessage = typeof threadMessages.$inferSelect;
export type NewThreadMessage = typeof threadMessages.$inferInsert;

export const reactions = sqliteTable(
  "reactions",
  {
    id: text("id").primaryKey(),
    messageId: text("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    emoji: text("emoji").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [unique().on(table.messageId, table.emoji)],
);

export const stocks = sqliteTable("stocks", {
  id: text("id").primaryKey(),
  status: text("status").notNull().default("inbox"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  group: text("group"),
  sourceMessageIds: text("source_message_ids").notNull().default("[]"),
  sourceChannelId: integer("source_channel_id").references(() => channels.id, {
    onDelete: "set null",
  }),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Stock = typeof stocks.$inferSelect;
export type NewStock = typeof stocks.$inferInsert;

export const stockTags = sqliteTable(
  "stock_tags",
  {
    id: text("id").primaryKey(),
    stockId: text("stock_id")
      .notNull()
      .references(() => stocks.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
  },
  (table) => [unique().on(table.stockId, table.tag)],
);

export type StockTag = typeof stockTags.$inferSelect;
export type NewStockTag = typeof stockTags.$inferInsert;
