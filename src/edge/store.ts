export interface Statement {
  bind(...values: Array<string | number>): Statement;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
}
export interface Database { prepare(sql: string): Statement; }

// A single SQLite statement keeps the check and increment atomic across Workers.
export async function takeWindow(db: Database, key: string, limit: number, duration: number, now: number): Promise<boolean> {
  const period = Math.floor(now / duration);
  const row = await db.prepare(`INSERT INTO request_windows (key, period, count) VALUES (?, ?, 1)
    ON CONFLICT(key) DO UPDATE SET period = excluded.period,
      count = CASE WHEN request_windows.period = excluded.period THEN request_windows.count + 1 ELSE 1 END
    WHERE excluded.period > request_windows.period
      OR (request_windows.period = excluded.period AND request_windows.count < ?)
    RETURNING count`).bind(key, period, limit).first<{count: number}>();
  return row !== null;
}
export async function readSearchCache(db: Database, query: string, now: number): Promise<unknown | null> {
  const row = await db.prepare("SELECT payload FROM search_cache WHERE query = ? AND expires_at > ?").bind(query, now).first<{payload:string}>();
  return row ? JSON.parse(row.payload) : null;
}
export async function writeSearchCache(db: Database, query: string, payload: unknown, now: number): Promise<void> {
  await db.prepare(`INSERT INTO search_cache (query, payload, expires_at) VALUES (?, ?, ?)
    ON CONFLICT(query) DO UPDATE SET payload = excluded.payload, expires_at = excluded.expires_at`)
    .bind(query, JSON.stringify(payload), now + 600_000).run();
}
