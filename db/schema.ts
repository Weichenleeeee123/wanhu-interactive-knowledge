import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const requestWindows = sqliteTable("request_windows", {
  key: text("key").primaryKey(),
  period: integer("period").notNull(),
  count: integer("count").notNull(),
});
export const searchCache = sqliteTable("search_cache", {
  query: text("query").primaryKey(),
  payload: text("payload").notNull(),
  expiresAt: integer("expires_at").notNull(),
});
