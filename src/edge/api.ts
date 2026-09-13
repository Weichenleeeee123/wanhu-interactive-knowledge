import { SourceSchema, type Source } from "../lib/lesson";
import { parseSearchPayload } from "../lib/search-results";
import { readBoundedText } from "../lib/server/bounded-response";
import { asServerError, ServerError } from "../lib/server/errors";
import { GenerateInputSchema, generateLesson } from "../lib/server/generate";
import { readJsonBody } from "../lib/server/request";
import {
  createKnowledgeClient,
  resolveZhihuLink,
} from "../lib/zhihu-materials";
import { FixedWindowLimiter } from "../lib/server/rate-limit";
import {
  readSearchCache,
  takeWindow,
  writeSearchCache,
  type Database,
} from "./store";

export interface Environment {
  DB?: Database;
  ZHIHU_ACCESS_SECRET?: string;
  ZHIHU_GENERATION?: string;
}
interface Dependencies {
  fetch: typeof globalThis.fetch;
  now: () => number;
}
const searchesInFlight = new WeakMap<
  Database,
  Map<string, Promise<Source[]>>
>();
const knowledgeClients = new WeakMap<
  typeof globalThis.fetch,
  ReturnType<typeof createKnowledgeClient>
>();
const materialLimiter = new FixedWindowLimiter(30, 60_000);
const json = (body: unknown, status = 200, extra?: Record<string, string>) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extra,
    },
  });
const statuses = {
  BAD_REQUEST: 400,
  PAYLOAD_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  UNCONFIGURED: 503,
  UPSTREAM_FAILURE: 502,
  INVALID_PROVIDER_OUTPUT: 502,
  DEADLINE_EXCEEDED: 504,
};
const messages = {
  BAD_REQUEST: "请求格式无效",
  PAYLOAD_TOO_LARGE: "材料过长，请缩短后重试",
  RATE_LIMITED:
    "体验请求较多或今日额度已用完，请稍后再试；两篇示例仍可完整体验",
  UNCONFIGURED: "在线生成暂未开放，可以先体验示例",
  UPSTREAM_FAILURE: "知乎服务暂时不可用，请稍后再试",
  INVALID_PROVIDER_OUTPUT: "这次生成未通过内容结构校验，请调整问题后重试",
  DEADLINE_EXCEEDED: "生成等待超时，材料已保留，请稍后再试",
};

async function identity(request: Request, secret: string): Promise<string> {
  // Only trust the edge-set connecting IP. Never store the raw address.
  const ip = request.headers.get("CF-Connecting-IP") ?? "shared-fallback";
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${secret}|${ip}`),
  );
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

async function official(
  env: Environment & { DB: Database; ZHIHU_ACCESS_SECRET: string },
  deps: Dependencies,
  url: string,
  deadline: number,
  body?: unknown,
): Promise<unknown> {
  if (deps.now() >= deadline)
    throw new ServerError("DEADLINE_EXCEEDED", "请求超时");
  if (
    !(await takeWindow(
      env.DB,
      "upstream",
      80,
      86400_000,
      deps.now() + 8 * 3600_000,
    ))
  )
    throw new ServerError("RATE_LIMITED", "今日体验额度已用完");
  const controller = new AbortController();
  const remaining = deadline - deps.now();
  if (remaining <= 0) throw new ServerError("DEADLINE_EXCEEDED", "请求超时");
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  try {
    const response = await Promise.race([
      deps.fetch(url, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          Authorization: `Bearer ${env.ZHIHU_ACCESS_SECRET}`,
          "X-Request-Timestamp": String(Math.floor(deps.now() / 1000)),
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: controller.signal,
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          reject(new ServerError("DEADLINE_EXCEEDED", "请求超时"));
          controller.abort();
        }, remaining);
      }),
    ]);
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new ServerError("UPSTREAM_FAILURE", "服务不可用");
    }
    const text = await readBoundedText(response, undefined, {
      deadline,
      now: deps.now,
      signal: controller.signal,
    });
    return JSON.parse(text);
  } catch (error) {
    if (timedOut) throw new ServerError("DEADLINE_EXCEEDED", "请求超时");
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
    controller.abort();
  }
}

export async function handleApi(
  request: Request,
  env: Environment,
  supplied: Partial<Dependencies> = {},
): Promise<Response> {
  const deps: Dependencies = {
    fetch: supplied.fetch ?? globalThis.fetch,
    now: supplied.now ?? Date.now,
  };
  const path = new URL(request.url).pathname;
  const methods: Record<string, string> = {
    "/api/capabilities": "GET",
    "/api/search": "GET",
    "/api/materials": "GET",
    "/api/generate": "POST",
  };
  if (!methods[path]) return json({ error: "接口不存在" }, 404);
  if (request.method !== methods[path])
    return json({ error: "请求方法不支持" }, 405, { Allow: methods[path] });
  if (
    request.headers.get("Origin") &&
    request.headers.get("Origin") !== new URL(request.url).origin
  )
    return json({ error: "请从玩乎页面发起请求" }, 403);
  const available = !!env.DB && !!env.ZHIHU_ACCESS_SECRET;
  if (path === "/api/capabilities")
    return json({
      search: available,
      generation: available && env.ZHIHU_GENERATION === "1",
      provider: available && env.ZHIHU_GENERATION === "1" ? "zhihu" : "none",
    });
  try {
    if (path === "/api/materials") {
      const client = await identity(request, "public-materials");
      if (!materialLimiter.take(client, deps.now()))
        throw new ServerError("RATE_LIMITED", "请求频繁");
      let knowledge = knowledgeClients.get(deps.fetch);
      if (!knowledge) {
        knowledge = createKnowledgeClient(deps.fetch, deps.now);
        knowledgeClients.set(deps.fetch, knowledge);
      }
      const params = new URL(request.url).searchParams;
      const id = params.get("knowledge"),
        link = params.get("url");
      if (id) return json({ material: await knowledge.detail(id) });
      if (link) {
        const material = await resolveZhihuLink(
          link,
          available
            ? async (query) => {
                const searchUrl = new URL("/api/search", request.url);
                searchUrl.searchParams.set("q", query);
                const response = await handleApi(
                  new Request(searchUrl, {
                    headers: request.headers,
                    signal: request.signal,
                  }),
                  env,
                  deps,
                );
                if (!response.ok)
                  throw new ServerError(
                    response.status === 429
                      ? "RATE_LIMITED"
                      : "UPSTREAM_FAILURE",
                    "知乎搜索暂不可用",
                  );
                return SourceSchema.array().parse(
                  ((await response.json()) as { items: unknown }).items,
                );
              }
            : undefined,
        );
        return json({ material });
      }
      return json({ items: await knowledge.list() });
    }
    if (!env.DB || !env.ZHIHU_ACCESS_SECRET)
      throw new ServerError("UNCONFIGURED", "服务未配置");
    const configured = {
      ...env,
      DB: env.DB,
      ZHIHU_ACCESS_SECRET: env.ZHIHU_ACCESS_SECRET,
    };
    const client = await identity(request, env.ZHIHU_ACCESS_SECRET);
    const generation = path === "/api/generate";
    if (
      !(await takeWindow(
        env.DB,
        `${generation ? "generate" : "search"}:${client}`,
        generation ? 5 : 20,
        generation ? 600_000 : 60_000,
        deps.now(),
      ))
    )
      throw new ServerError("RATE_LIMITED", "请求频繁");
    if (!generation) {
      const query = (new URL(request.url).searchParams.get("q") ?? "").trim();
      if (!query || query.length > 200)
        throw new ServerError("BAD_REQUEST", "搜索词无效");
      const cached = await readSearchCache(env.DB, query, deps.now());
      const validated = SourceSchema.array().max(10).safeParse(cached);
      if (cached !== null && validated.success)
        return json({ items: validated.data });
      let pending = searchesInFlight.get(env.DB);
      if (!pending) {
        pending = new Map();
        searchesInFlight.set(env.DB, pending);
      }
      let operation = pending.get(query);
      if (!operation) {
        operation = (async () => {
          const url = new URL(
            "https://developer.zhihu.com/api/v1/content/zhihu_search",
          );
          url.searchParams.set("Query", query);
          url.searchParams.set("Count", "5");
          const sources = parseSearchPayload(
            await official(
              configured,
              deps,
              url.toString(),
              deps.now() + 30_000,
            ),
          );
          await writeSearchCache(configured.DB, query, sources, deps.now());
          return sources;
        })();
        pending.set(query, operation);
      }
      try {
        return json({ items: await operation });
      } finally {
        if (pending.get(query) === operation) pending.delete(query);
      }
    }
    if (env.ZHIHU_GENERATION !== "1")
      throw new ServerError("UNCONFIGURED", "生成未配置");
    const deadline = deps.now() + 45_000;
    const parsed = GenerateInputSchema.safeParse(
      await readJsonBody(request, 256 * 1024, deadline),
    );
    if (!parsed.success) throw new ServerError("BAD_REQUEST", "生成参数无效");
    return json(
      await generateLesson(parsed.data, {
        now: deps.now,
        deadline,
        provider: async (context) => {
          const raw = await official(
            configured,
            deps,
            "https://developer.zhihu.com/v1/chat/completions",
            context.deadline,
            {
              model: "zhida-fast-1p5",
              messages: [{ role: "user", content: context.prompt }],
              stream: false,
            },
          );
          const content = (
            raw as { choices?: Array<{ message?: { content?: unknown } }> }
          )?.choices?.[0]?.message?.content;
          if (typeof content !== "string")
            throw new ServerError("UPSTREAM_FAILURE", "模型返回格式异常");
          return content;
        },
      }),
    );
  } catch (error) {
    const safe = asServerError(error);
    return json(
      { error: messages[safe.code] },
      statuses[safe.code],
      safe.code === "RATE_LIMITED" ? { "Retry-After": "600" } : undefined,
    );
  }
}
