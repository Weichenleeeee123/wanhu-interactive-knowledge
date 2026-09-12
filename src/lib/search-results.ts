import { SourceSchema, type Source } from "./lesson";
import { ServerError } from "./server/errors";

export function parseSearchPayload(raw: unknown): Source[] {
  if (!raw || typeof raw !== "object") throw new ServerError("UPSTREAM_FAILURE", "知乎搜索返回格式异常");
  const envelope = raw as { Code?: unknown; Data?: { Items?: unknown } };
  if (envelope.Code !== 0 || !Array.isArray(envelope.Data?.Items))
    throw new ServerError("UPSTREAM_FAILURE", "知乎搜索暂时不可用");
  const mapped: Source[] = [];
  for (const item of envelope.Data.Items.slice(0, 10)) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const parsed = SourceSchema.safeParse({
      id: String(record.ContentID ?? "").trim(),
      title: String(record.Title ?? "").trim(),
      author: String(record.AuthorName ?? "").trim().slice(0, 80),
      url: String(record.Url ?? "").trim(),
      excerpt: String(record.ContentText ?? "").slice(0, 1200),
    });
    if (parsed.success) mapped.push(parsed.data);
  }
  return mapped;
}
