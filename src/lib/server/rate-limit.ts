type Window = { startedAt: number; count: number };

export class FixedWindowLimiter {
  private readonly windows = new Map<string, Window>();

  constructor(
    private readonly limit: number,
    private readonly durationMs: number,
    private readonly maxKeys = 10_000,
  ) {}

  take(key: string, now = Date.now()): boolean {
    for (const [storedKey, window] of this.windows) {
      if (now - window.startedAt >= this.durationMs)
        this.windows.delete(storedKey);
    }
    const current = this.windows.get(key);
    if (!current) {
      if (this.windows.size >= this.maxKeys) return false;
      this.windows.set(key, { startedAt: now, count: 1 });
      return true;
    }
    if (current.count >= this.limit) return false;
    current.count += 1;
    return true;
  }
}

export function requestIdentity(
  request: Request,
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (env.TRUST_PROXY === "1") {
    const forwarded = request.headers
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim();
    if (forwarded) return `proxy:${forwarded.slice(0, 100)}`;
  }
  return "global";
}
