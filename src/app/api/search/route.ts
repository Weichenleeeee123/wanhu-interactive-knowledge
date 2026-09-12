import { NextResponse } from "next/server";
import { ServerError } from "@/lib/server/errors";
import { FixedWindowLimiter, requestIdentity } from "@/lib/server/rate-limit";
import { errorResponse } from "@/lib/server/responses";
import { searchZhihu } from "@/lib/server/search";

export const runtime = "nodejs";
const limiter = new FixedWindowLimiter(20, 60_000);

export async function GET(request: Request) {
  const deadline = Date.now() + 30_000;
  try {
    if (!limiter.take(requestIdentity(request)))
      throw new ServerError("RATE_LIMITED", "搜索请求过于频繁");
    const query = new URL(request.url).searchParams.get("q");
    if (query === null) throw new ServerError("BAD_REQUEST", "缺少搜索词");
    const items = await searchZhihu(query, 5, {
      deadline,
      signal: request.signal,
    });
    return NextResponse.json({ items });
  } catch (error) {
    return errorResponse(error);
  }
}
