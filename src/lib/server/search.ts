import { isAbsolute } from "node:path";
import { stat } from "node:fs/promises";
import { type Source } from "../lesson";
import { parseSearchPayload } from "../search-results";
import { readBoundedText } from "./bounded-response";
import { defaultExecFile, isVerifiedZhihuCli, type ExecFile } from "./cli";
import { ServerError } from "./errors";

export interface SearchDependencies {
  fetch: (input: string, init?: RequestInit) => Promise<Response>;
  now: () => number;
  env: Record<string, string | undefined>;
  execFile?: ExecFile;
  isAbsolute?: (path: string) => boolean;
  isFile?: (path: string) => Promise<boolean>;
  deadline?: number;
  signal?: AbortSignal;
}

const defaults: SearchDependencies = {
  fetch: globalThis.fetch,
  now: Date.now,
  env: process.env,
  execFile: defaultExecFile,
};

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new ServerError("UPSTREAM_FAILURE", "知乎搜索返回格式异常");
  }
}

async function withinDeadline<T>(
  operation: Promise<T>,
  deadline: number,
  now: () => number,
  onTimeout?: () => void,
): Promise<T> {
  const remaining = deadline - now();
  if (remaining <= 0) {
    onTimeout?.();
    throw new ServerError("DEADLINE_EXCEEDED", "知乎搜索超时");
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new ServerError("DEADLINE_EXCEEDED", "知乎搜索超时"));
          onTimeout?.();
        }, remaining);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function searchZhihu(
  query: string,
  requestedCount = 5,
  supplied: Partial<SearchDependencies> = {},
): Promise<Source[]> {
  const deps = { ...defaults, ...supplied };
  const normalized = query.trim();
  if (!normalized || normalized.length > 200)
    throw new ServerError("BAD_REQUEST", "搜索词长度须为 1 到 200 个字符");
  const count = Math.max(1, Math.min(10, Math.trunc(requestedCount) || 5));
  const deadline = deps.deadline ?? deps.now() + 30_000;
  const secret = deps.env.ZHIHU_ACCESS_SECRET;
  if (secret) {
    const url = new URL(
      "https://developer.zhihu.com/api/v1/content/zhihu_search",
    );
    url.searchParams.set("Query", normalized);
    url.searchParams.set("Count", String(count));
    const controller = new AbortController();
    const disconnect = () => controller.abort();
    if (deps.signal?.aborted) controller.abort();
    else deps.signal?.addEventListener("abort", disconnect, { once: true });
    try {
      const response = await withinDeadline(
        deps.fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${secret}`,
            "X-Request-Timestamp": String(Math.floor(deps.now() / 1000)),
            Accept: "application/json",
          },
          signal: controller.signal,
        }),
        deadline,
        deps.now,
        () => controller.abort(),
      );
      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        throw new ServerError("UPSTREAM_FAILURE", "知乎搜索暂时不可用");
      }
      return parseSearchPayload(
        parseJson(
          await readBoundedText(response, undefined, {
            deadline,
            now: deps.now,
            signal: controller.signal,
          }),
        ),
      );
    } catch (error) {
      if (error instanceof ServerError) throw error;
      throw new ServerError("UPSTREAM_FAILURE", "知乎搜索暂时不可用");
    } finally {
      deps.signal?.removeEventListener("abort", disconnect);
      controller.abort();
    }
  }

  const cliPath = deps.env.ZHIHU_CLI_PATH;
  const verified = await withinDeadline(
    isVerifiedZhihuCli(cliPath, {
      isAbsolute: deps.isAbsolute ?? isAbsolute,
      isFile:
        deps.isFile ??
        (async (path) => {
          try {
            return (await stat(path)).isFile();
          } catch {
            return false;
          }
        }),
    }),
    deadline,
    deps.now,
  );
  if (!verified || !cliPath)
    throw new ServerError("UNCONFIGURED", "未配置知乎搜索服务");
  try {
    const remaining = deadline - deps.now();
    if (remaining <= 0)
      throw new ServerError("DEADLINE_EXCEEDED", "知乎搜索超时");
    const result = await withinDeadline(
      (deps.execFile ?? defaultExecFile)(
        cliPath,
        [
          "search",
          "zhihu",
          "--query",
          normalized,
          "--count",
          String(Math.min(count, 5)),
        ],
        {
          shell: false,
          timeout: remaining,
          maxBuffer: 128 * 1024,
          windowsHide: true,
        },
      ),
      deadline,
      deps.now,
    );
    if (deps.now() >= deadline)
      throw new ServerError("DEADLINE_EXCEEDED", "知乎搜索超时");
    if (Buffer.byteLength(result.stdout, "utf8") > 128 * 1024)
      throw new Error("oversized");
    return parseSearchPayload(parseJson(result.stdout));
  } catch (error) {
    if (error instanceof ServerError) throw error;
    throw new ServerError("UPSTREAM_FAILURE", "知乎搜索暂时不可用");
  }
}
