export type ServerErrorCode =
  | "BAD_REQUEST"
  | "PAYLOAD_TOO_LARGE"
  | "RATE_LIMITED"
  | "UNCONFIGURED"
  | "UPSTREAM_FAILURE"
  | "INVALID_PROVIDER_OUTPUT"
  | "DEADLINE_EXCEEDED";

export class ServerError extends Error {
  constructor(
    public readonly code: ServerErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ServerError";
  }
}

export function asServerError(
  error: unknown,
  fallback: ServerErrorCode = "UPSTREAM_FAILURE",
): ServerError {
  if (error instanceof ServerError) return error;
  return new ServerError(fallback, "服务暂时不可用");
}
