import { createKnowledgeClient, resolveZhihuLink } from "@/lib/zhihu-materials";
import { searchZhihu } from "@/lib/server/search";
import { getCapabilities } from "@/lib/server/capabilities";
import { FixedWindowLimiter, requestIdentity } from "@/lib/server/rate-limit";
import { errorResponse } from "@/lib/server/responses";
import { ServerError } from "@/lib/server/errors";
export const runtime = "nodejs";
const knowledge = createKnowledgeClient(),
  limiter = new FixedWindowLimiter(30, 60000);
export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    if (
      request.headers.get("origin") &&
      request.headers.get("origin") !== url.origin
    )
      throw new ServerError("BAD_REQUEST", "请从玩乎页面发起请求");
    if (!limiter.take(requestIdentity(request)))
      throw new ServerError("RATE_LIMITED", "内容读取过于频繁");
    const id = url.searchParams.get("knowledge"),
      link = url.searchParams.get("url");
    const body = id
      ? { material: await knowledge.detail(id) }
      : link
        ? {
            material: await resolveZhihuLink(
              link,
              (await getCapabilities()).search
                ? (query) => searchZhihu(query, 5, { signal: request.signal })
                : undefined,
            ),
          }
        : { items: await knowledge.list() };
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
