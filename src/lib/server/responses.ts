import { NextResponse } from "next/server";
import { ServerError, asServerError } from "./errors";

const statusByCode: Record<ServerError["code"], number> = {
  BAD_REQUEST: 400,
  PAYLOAD_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  UNCONFIGURED: 503,
  UPSTREAM_FAILURE: 502,
  INVALID_PROVIDER_OUTPUT: 502,
  DEADLINE_EXCEEDED: 504,
};

const publicMessages: Record<ServerError["code"], string> = {
  BAD_REQUEST: "请求格式无效",
  PAYLOAD_TOO_LARGE: "请求内容过大",
  RATE_LIMITED: "请求过于频繁，请稍后再试",
  UNCONFIGURED: "服务尚未配置",
  UPSTREAM_FAILURE: "上游服务暂时不可用",
  INVALID_PROVIDER_OUTPUT: "模型返回内容无法验证",
  DEADLINE_EXCEEDED: "请求超时，请稍后再试",
};

export function errorResponse(error: unknown): NextResponse<{ error: string }> {
  const safe = asServerError(error);
  const message =
    safe.code === "BAD_REQUEST" ? safe.message : publicMessages[safe.code];
  return NextResponse.json(
    { error: message },
    { status: statusByCode[safe.code] },
  );
}
