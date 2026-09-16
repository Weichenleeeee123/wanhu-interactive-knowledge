import { readBoundedText } from './server/bounded-response';

interface ApiResponse {
  error?: string;
  unsupported?: boolean;
  reason?: string;
  lesson?: unknown;
  answer?: string;
  [key: string]: unknown;
}

/** Proxies may return HTML instead of the API's JSON error. */
export async function readApiResponse(response: Response, deadline = Date.now() + 50_000): Promise<ApiResponse> {
  if ([408, 504, 524].includes(response.status)) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error('生成请求超时，请稍后重试或缩短选段，材料已保留。');
  }
  const fallback = response.ok
    ? '服务返回了非 JSON 数据，请稍后重试，材料已保留。'
    : `生成服务暂时不可用（HTTP ${response.status}），请稍后重试，材料已保留。`;
  let body: unknown;
  try {
    body = JSON.parse(await readBoundedText(response, 128 * 1024, {deadline, now: Date.now}));
  } catch {
    throw new Error(fallback);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('服务返回格式异常，请稍后重试，材料已保留。');
  }
  const result = body as ApiResponse;
  if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : fallback);
  return result;
}
