import { NextResponse } from "next/server";
import { ServerError } from "@/lib/server/errors";
import { GenerateInputSchema, generateLesson } from "@/lib/server/generate";
import { createGenerationProvider } from "@/lib/server/generation-provider";
import { FixedWindowLimiter, requestIdentity } from "@/lib/server/rate-limit";
import { readJsonBody } from "@/lib/server/request";
import { errorResponse } from "@/lib/server/responses";

export const runtime = "nodejs";
const limiter = new FixedWindowLimiter(5, 10 * 60_000);

export async function POST(request: Request) {
  const deadline = Date.now() + 45_000;
  try {
    if (!limiter.take(requestIdentity(request)))
      throw new ServerError("RATE_LIMITED", "生成请求过于频繁");
    const body = await readJsonBody(request, 256 * 1024, deadline);
    const parsed = GenerateInputSchema.safeParse(body);
    if (!parsed.success)
      throw new ServerError("BAD_REQUEST", "生成请求格式无效");
    if (!parsed.data.standardModel) {
      return NextResponse.json({
        unsupported: true,
        reason: "请先确认生成后核对讲解、原句与材料的关系",
      });
    }
    const provider = await createGenerationProvider(
      process.env,
      undefined,
      deadline,
    );
    if (!provider) throw new ServerError("UNCONFIGURED", "生成服务尚未配置");
    return NextResponse.json(
      await generateLesson(parsed.data, { provider, deadline }),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
