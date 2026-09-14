import { z } from "zod";
import { SourceSchema, type Source } from "./lesson";
import { ServerError } from "./server/errors";
import { readBoundedText } from "./server/bounded-response";

const BASE = "https://api.zhihu.com/km-indep-home/hackathon/v2/knowledge";
const idSchema = z.string().regex(/^\d{1,25}$/);
export const KnowledgeItemSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(2000),
});
export type KnowledgeItem = z.infer<typeof KnowledgeItemSchema>;
export const ArticleMaterialSchema = z.object({
  source: SourceSchema,
  text: z.string().max(200000),
  coverage: z.enum(["official-body", "search-excerpt", "link-only"]),
  note: z.string().max(500),
});
export type ArticleMaterial = z.infer<typeof ArticleMaterialSchema>;
export function plainText(value: string) {
  return value
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(
      /<!--[^]*?-->|<\/?(p|div|span|a|strong|b|em|i|u|s|br|hr|h[1-6]|ul|ol|li|blockquote|pre|code|section|article|table|thead|tbody|tr|th|td|img|figure|figcaption|sup|sub)(?:\s+[a-z_:][a-z0-9_:.-]*(?:\s*=\s*(?:"[^"<>]*"|'[^'<>]*'|[^\s<>]+))?)*\s*\/?>/gi,
      (_tag, name: string | undefined) =>
        name && /^(p|div|h[1-6]|li|blockquote|br)$/i.test(name) ? "\n" : "",
    )
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
export function parseZhihuLink(value: string): {
  type: "article" | "answer" | "question";
  id: string;
  url: string;
} {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new ServerError(
      "BAD_REQUEST",
      "请填写完整的知乎文章、回答或问题链接",
    );
  }
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.port ||
    !["www.zhihu.com", "zhihu.com", "zhuanlan.zhihu.com"].includes(url.hostname)
  )
    throw new ServerError("BAD_REQUEST", "只支持知乎文章、回答和问题链接");
  let match: RegExpMatchArray | null;
  if (
    url.hostname === "zhuanlan.zhihu.com" &&
    (match = url.pathname.match(/^\/p\/(\d{1,25})\/?$/))
  )
    return {
      type: "article",
      id: match[1],
      url: `https://zhuanlan.zhihu.com/p/${match[1]}`,
    };
  if (url.hostname !== "zhuanlan.zhihu.com") {
    if (
      (match = url.pathname.match(
        /^\/question\/(\d{1,25})\/answer\/(\d{1,25})\/?$/,
      ))
    )
      return {
        type: "answer",
        id: match[2],
        url: `https://www.zhihu.com/question/${match[1]}/answer/${match[2]}`,
      };
    if (
      (match = url.pathname.match(
        /^\/(?:answer|tardis\/(?:bd|zm|jm)\/ans)\/(\d{1,25})\/?$/,
      ))
    )
      return {
        type: "answer",
        id: match[1],
        url: `https://www.zhihu.com/answer/${match[1]}`,
      };
    if ((match = url.pathname.match(/^\/tardis\/(?:bd|zm|jm)\/art\/(\d{1,25})\/?$/)))
      return {
        type: "article",
        id: match[1],
        url: `https://zhuanlan.zhihu.com/p/${match[1]}`,
      };
    if ((match = url.pathname.match(/^\/question\/(\d{1,25})\/?$/)))
      return {
        type: "question",
        id: match[1],
        url: `https://www.zhihu.com/question/${match[1]}`,
      };
  }
  throw new ServerError(
    "BAD_REQUEST",
    "请使用具体文章或回答的链接，暂不支持短链接和个人主页",
  );
}
export async function resolveZhihuLink(
  value: string,
  search?: (query: string) => Promise<Source[]>,
): Promise<ArticleMaterial> {
  const target = parseZhihuLink(value);
  const fallback: ArticleMaterial = {
    source: {
      id: `zhihu-${target.type}-${target.id}`,
      title: "待补充标题的知乎内容",
      author: "",
      url: target.url,
      excerpt: "",
      provenance: "user",
      contentScope: "link-only",
    },
    text: "",
    coverage: "link-only",
    note: "已识别知乎链接。当前接口不能获取任意文章全文，请粘贴你能阅读的关键段落，并补充标题与作者。",
  };
  if (!search) return fallback;
  const results = await search(target.url);
  const source = results.find((item) => {
    try {
      const candidate = parseZhihuLink(item.url);
      return candidate.type === target.type && candidate.id === target.id;
    } catch {
      return false;
    }
  });
  if (!source) return fallback;
  const text = plainText(source.excerpt);
  return {
    source: {
      ...source,
      excerpt: text,
      provenance: "zhihu-search",
      contentScope: "search-excerpt",
    },
    text,
    coverage: "search-excerpt",
    note: "已通过知乎官方搜索匹配到这条内容，当前带入的是搜索摘要。需要完整上下文时，请补充原文段落。",
  };
}
export function createKnowledgeClient(
  fetcher: (
    url: string,
    init?: RequestInit,
  ) => Promise<Response> = globalThis.fetch,
  now = Date.now,
) {
  const cache = new Map<string, { expires: number; value: unknown }>(),
    pending = new Map<string, Promise<unknown>>();
  async function json(path: string): Promise<unknown> {
    const hit = cache.get(path);
    if (hit && hit.expires > now()) return hit.value;
    const existing = pending.get(path);
    if (existing) return existing;
    const operation = (async () => {
      const controller = new AbortController();
      const deadline = now() + 15000;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const response = await Promise.race([
          fetcher(`${BASE}/${path}`, {
            headers: { Accept: "application/json" },
            redirect: "error",
            signal: controller.signal,
          }),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              reject(new ServerError("DEADLINE_EXCEEDED", "知乎内容读取超时"));
              controller.abort();
            }, 15000);
          }),
        ]);
        if (!response.ok) {
          await response.body?.cancel();
          throw new ServerError(
            "UPSTREAM_FAILURE",
            `知乎内容接口返回 HTTP ${response.status}`,
          );
        }
        const value = JSON.parse(
          await readBoundedText(response, 512 * 1024, {
            deadline,
            now,
            signal: controller.signal,
          }),
        );
        cache.set(path, { expires: now() + 10 * 60000, value });
        return value;
      } finally {
        if (timer) clearTimeout(timer);
        controller.abort();
      }
    })();
    pending.set(path, operation);
    try {
      return await operation;
    } finally {
      pending.delete(path);
    }
  }
  async function list(): Promise<KnowledgeItem[]> {
    const raw = z
      .array(
        z.object({
          work_id: idSchema,
          title: z.string().min(1).max(200),
          description: z.string().max(2000).optional(),
        }),
      )
      .max(200)
      .parse(await json("list"));
    return raw.map((item) => ({
      id: item.work_id,
      title: item.title,
      description: plainText(item.description ?? ""),
    }));
  }
  async function detail(id: string): Promise<ArticleMaterial> {
    if (!idSchema.safeParse(id).success)
      throw new ServerError("BAD_REQUEST", "知识内容标识无效");
    const item = (await list()).find((item) => item.id === id);
    if (!item)
      throw new ServerError("BAD_REQUEST", "请从官方知识列表中选择内容");
    const raw = z
      .object({
        work_id: idSchema,
        chapter_name: z.string().max(200).optional(),
        author_name: z.string().max(80).optional(),
        content: z.string().max(200000),
      })
      .parse(await json(`story/${encodeURIComponent(id)}`));
    if (raw.work_id !== id)
      throw new ServerError("UPSTREAM_FAILURE", "知乎返回的内容标识不匹配");
    const text = plainText(raw.content);
    if (!text)
      throw new ServerError("UPSTREAM_FAILURE", "知乎尚未提供这份内容的正文");
    return {
      source: {
        id: `knowledge-${id}`,
        title: raw.chapter_name || item.title,
        author: raw.author_name ?? "",
        url: `${BASE}/story/${id}`,
        excerpt: text.slice(0, 1200),
        provenance: "zhihu-knowledge",
        contentScope: "official-body",
      },
      text,
      coverage: "official-body",
      note: "来自本次黑客松官方知识内容接口，保留原作者归属。这里是接口提供的正文材料，可能为节选；你可以补充原文上下文。",
    };
  }
  return { list, detail };
}
