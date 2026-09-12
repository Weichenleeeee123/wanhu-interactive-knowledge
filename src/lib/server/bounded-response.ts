import { ServerError } from "./errors";

export const MAX_PROVIDER_BYTES = 128 * 1024;

interface BoundedReadOptions {
  deadline?: number;
  now?: () => number;
  signal?: AbortSignal;
}

async function readChunk(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  options: BoundedReadOptions,
): Promise<ReadableStreamReadResult<Uint8Array>> {
  const now = options.now ?? Date.now;
  if (options.signal?.aborted) {
    await reader.cancel().catch(() => undefined);
    throw new ServerError("UPSTREAM_FAILURE", "请求已取消");
  }
  if (options.deadline === undefined) return reader.read();
  const remaining = options.deadline - now();
  if (remaining <= 0) {
    await reader.cancel().catch(() => undefined);
    throw new ServerError("DEADLINE_EXCEEDED", "上游响应超时");
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort: (() => void) | undefined;
  try {
    return await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new ServerError("DEADLINE_EXCEEDED", "上游响应超时"));
          void reader.cancel().catch(() => undefined);
        }, remaining);
        if (options.signal) {
          abort = () => {
            reject(new ServerError("UPSTREAM_FAILURE", "请求已取消"));
            void reader.cancel().catch(() => undefined);
          };
          options.signal.addEventListener("abort", abort, { once: true });
        }
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    if (abort && options.signal)
      options.signal.removeEventListener("abort", abort);
  }
}

export async function readBoundedText(
  response: Response,
  maxBytes = MAX_PROVIDER_BYTES,
  options: BoundedReadOptions = {},
): Promise<string> {
  const declared = response.headers.get("content-length");
  if (declared && Number(declared) > maxBytes) {
    await response.body?.cancel().catch(() => undefined);
    throw new ServerError("UPSTREAM_FAILURE", "上游响应过大");
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await readChunk(reader, options);
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new ServerError("UPSTREAM_FAILURE", "上游响应过大");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}
