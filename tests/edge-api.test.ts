import { describe, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { takeWindow, type Database } from "../src/edge/store";
import { handleApi } from "../src/edge/api";
import { getExample } from "../src/lib/examples";

function database(): Database {
  const db = new DatabaseSync(":memory:");
  for (const name of readdirSync("drizzle").filter((n) => n.endsWith(".sql")))
    db.exec(readFileSync(`drizzle/${name}`, "utf8"));
  return {
    prepare(sql: string) {
      let args: Array<string | number> = [];
      const statement = {
        bind(...values: Array<string | number>) {
          args = values;
          return statement;
        },
        async first<T>() {
          return (db.prepare(sql).get(...args) ?? null) as T | null;
        },
        async run() {
          db.prepare(sql).run(...args);
          return {};
        },
      };
      return statement;
    },
  };
}
const request = (path: string, init?: RequestInit) =>
  new Request(`https://demo.test${path}`, init);
const input = {
  mode: "learn",
  material: "三门问题",
  question: "换门吗",
  sources: [],
  standardModel: true,
};

describe("hosted API", () => {
  it("loads public Zhihu knowledge without private credentials and caches the fixed endpoint", async () => {
    const fetch = vi.fn(async () =>
      Response.json([
        { work_id: "123", title: "测试知识", description: "介绍" },
      ]),
    );
    const env = { ZHIHU_ACCESS_SECRET: "must-not-be-sent" };
    const response = await handleApi(request("/api/materials"), env, { fetch });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [{ id: "123", title: "测试知识", description: "介绍" }],
    });
    await handleApi(request("/api/materials"), env, { fetch });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]).toMatchObject([
      "https://api.zhihu.com/km-indep-home/hackathon/v2/knowledge/list",
      { headers: { Accept: "application/json" }, redirect: "error" },
    ]);
    expect(JSON.stringify(fetch.mock.calls)).not.toContain("must-not-be-sent");
  });
  it("recognizes a Zhihu source link without fetching arbitrary pages and rejects hostile hosts", async () => {
    const fetch = vi.fn();
    const response = await handleApi(
      request("/api/materials?url=https://zhuanlan.zhihu.com/p/123"),
      {},
      { fetch },
    );
    expect(await response.json()).toMatchObject({
      material: {
        coverage: "link-only",
        text: "",
        source: { url: "https://zhuanlan.zhihu.com/p/123" },
      },
    });
    expect(
      (
        await handleApi(
          request("/api/materials?url=http://127.0.0.1/private"),
          {},
          { fetch },
        )
      ).status,
    ).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("never calls upstream without both storage and secret", async () => {
    const fetch = vi.fn();
    const response = await handleApi(
      request("/api/search?q=概率"),
      { ZHIHU_ACCESS_SECRET: "test" },
      { fetch },
    );
    expect(response.status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("enforces atomic limits and resets on the next window", async () => {
    const db = database();
    const results = await Promise.all(
      Array.from({ length: 100 }, () => takeWindow(db, "quota", 80, 1000, 500)),
    );
    expect(results.filter(Boolean)).toHaveLength(80);
    expect(await takeWindow(db, "quota", 80, 1000, 999)).toBe(false);
    expect(await takeWindow(db, "quota", 80, 1000, 1000)).toBe(true);
  });
  it("reuses a cached official search result and expires it", async () => {
    const env = { DB: database(), ZHIHU_ACCESS_SECRET: "test" };
    const fetch = vi.fn(async () =>
      Response.json({ Code: 0, Data: { Items: [] } }),
    );
    let now = 1000;
    const deps = { fetch, now: () => now };
    expect(
      (await handleApi(request("/api/search?q=概率"), env, deps)).status,
    ).toBe(200);
    expect(
      (await handleApi(request("/api/search?q=%20概率%20"), env, deps)).status,
    ).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
    now += 600_001;
    expect(
      (await handleApi(request("/api/search?q=概率"), env, deps)).status,
    ).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("rejects stale reservations without reopening the current quota", async () => {
    const db = database();
    expect(await takeWindow(db, "day", 1, 1000, 2000)).toBe(true);
    expect(await takeWindow(db, "day", 1, 1000, 1000)).toBe(false);
    expect(await takeWindow(db, "day", 1, 1000, 2000)).toBe(false);
    expect(await takeWindow(db, "day", 1, 1000, 3000)).toBe(true);
  });
  it("coalesces simultaneous searches for the same query", async () => {
    const env = { DB: database(), ZHIHU_ACCESS_SECRET: "test" };
    const fetch = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return Response.json({ Code: 0, Data: { Items: [] } });
    });
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        handleApi(request("/api/search?q=same"), env, { fetch }),
      ),
    );
    expect(responses.every((r) => r.status === 200)).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(await responses[0].json()).toEqual({ items: [] });
  });
  it.each(["headers", "body"])(
    "reports a deadline while waiting for %s as 504",
    async (stage) => {
      const now = Date.now();
      let calls = 0;
      const clock = () => {
        calls++;
        return calls < 5 ? now : now + 29_990;
      };
      const fetch = vi.fn(
        async (_url: string | URL | Request, init?: RequestInit) => {
          if (stage === "headers")
            return new Promise<Response>((_resolve, reject) =>
              init?.signal?.addEventListener("abort", () =>
                reject(new Error("aborted")),
              ),
            );
          return new Response(
            new ReadableStream({
              start(controller) {
                init?.signal?.addEventListener("abort", () =>
                  controller.error(new Error("aborted")),
                );
              },
            }),
          );
        },
      );
      const response = await handleApi(
        request("/api/search?q=timeout"),
        { DB: database(), ZHIHU_ACCESS_SECRET: "test" },
        { fetch, now: clock },
      );
      expect(response.status).toBe(504);
    },
  );
  it("charges each model attempt and blocks a repair when the daily budget is exhausted", async () => {
    const DB = database();
    const now = Date.now();
    for (let i = 0; i < 79; i++)
      await takeWindow(DB, "upstream", 80, 86400_000, now + 8 * 3600_000);
    const fetch = vi.fn(async () =>
      Response.json({ choices: [{ message: { content: "invalid" } }] }),
    );
    const response = await handleApi(
      request("/api/generate", { method: "POST", body: JSON.stringify(input) }),
      { DB, ZHIHU_ACCESS_SECRET: "test", ZHIHU_GENERATION: "1" },
      { fetch, now: () => now },
    );
    expect(response.status).toBe(429);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("generates through the shared schema and never reflects provider errors", async () => {
    const env = {
      DB: database(),
      ZHIHU_ACCESS_SECRET: "test",
      ZHIHU_GENERATION: "1",
    };
    const fetch = vi.fn(async () =>
      Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                ...getExample("monty-hall"),
                sources: [],
                sourceIds: [],
              }),
            },
          },
        ],
      }),
    );
    const response = await handleApi(
      request("/api/generate", { method: "POST", body: JSON.stringify(input) }),
      env,
      { fetch },
    );
    expect(response.status).toBe(200);
    expect((await response.json()).lesson.origin).toBe("ai");
    fetch.mockRejectedValueOnce(new Error("secret: do not expose"));
    const failed = await handleApi(request("/api/search?q=新查询"), env, {
      fetch,
    });
    expect(failed.status).toBe(502);
    expect(await failed.text()).not.toContain("secret");
  });
  it("rejects cross-site generation and unknown API routes", async () => {
    const env = {
      DB: database(),
      ZHIHU_ACCESS_SECRET: "test",
      ZHIHU_GENERATION: "1",
    };
    const fetch = vi.fn();
    expect(
      (
        await handleApi(
          request("/api/generate", {
            method: "POST",
            headers: { origin: "https://evil.test" },
            body: JSON.stringify(input),
          }),
          env,
          { fetch },
        )
      ).status,
    ).toBe(403);
    expect(
      (await handleApi(request("/api/anything"), env, { fetch })).status,
    ).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });
});
