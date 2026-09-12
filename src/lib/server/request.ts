import { ServerError } from "./errors";

export const MAX_REQUEST_BYTES = 128 * 1024;

async function readBeforeDeadline(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  deadline: number,
): Promise<ReadableStreamReadResult<Uint8Array>> {
  const remaining = deadline - Date.now();
  if (remaining <= 0) {
    await reader.cancel().catch(() => undefined);
    throw new ServerError("DEADLINE_EXCEEDED", "请求超时");
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new ServerError("DEADLINE_EXCEEDED", "请求超时"));
          void reader.cancel().catch(() => undefined);
        }, remaining);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function readJsonBody(
  request: Request,
  maxBytes = MAX_REQUEST_BYTES,
  deadline = Date.now() + 45_000,
): Promise<unknown> {
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > maxBytes)
    throw new ServerError("PAYLOAD_TOO_LARGE", "请求内容过大");
  if (!request.body) throw new ServerError("BAD_REQUEST", "请求内容不能为空");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await readBeforeDeadline(reader, deadline);
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new ServerError("PAYLOAD_TOO_LARGE", "请求内容过大");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new ServerError("BAD_REQUEST", "请求必须是有效的 JSON");
  }
}
