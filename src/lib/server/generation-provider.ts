import { isAbsolute } from "node:path";
import { stat } from "node:fs/promises";
import { readBoundedText } from "./bounded-response";
import {
  defaultExecFile,
  isVerifiedZhihuCli,
  windowsCommandLineLength,
  type ExecFile,
} from "./cli";
import { ServerError } from "./errors";
import type { GenerationProvider } from "./generate";
import { getAiChatConfig } from "./provider-config";

export interface GenerationProviderDependencies {
  fetch: (input: string, init?: RequestInit) => Promise<Response>;
  now: () => number;
  execFile: ExecFile;
  isAbsolute: (path: string) => boolean;
  isFile: (path: string) => Promise<boolean>;
}

function remaining(deadline: number, now: () => number): number {
  const value = deadline - now();
  if (value <= 0) throw new ServerError("DEADLINE_EXCEEDED", "生成超时");
  return Math.min(45_000, value);
}

async function beforeDeadline<T>(
  operation: Promise<T>,
  deadline: number,
  now: () => number,
): Promise<T> {
  const wait = remaining(deadline, now);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new ServerError("DEADLINE_EXCEEDED", "生成超时")),
          wait,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function postChat(
  url: string,
  key: string,
  model: string,
  prompt: string,
  deadline: number,
  dependencies: GenerationProviderDependencies,
  timestamp = false,
): Promise<string> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(
    () => {
      timedOut = true;
      controller.abort();
    },
    remaining(deadline, dependencies.now),
  );
  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (timestamp)
      headers["X-Request-Timestamp"] = String(
        Math.floor(dependencies.now() / 1000),
      );
    const response = await dependencies.fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        stream: false,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      controller.abort();
      throw new ServerError("UPSTREAM_FAILURE", "生成服务暂时不可用");
    }
    const text = await readBoundedText(response, undefined, {
      deadline,
      now: dependencies.now,
      signal: controller.signal,
    });
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      throw new ServerError("UPSTREAM_FAILURE", "生成服务返回格式异常");
    }
    const content = (
      body as { choices?: Array<{ message?: { content?: unknown } }> }
    )?.choices?.[0]?.message?.content;
    if (typeof content !== "string")
      throw new ServerError("UPSTREAM_FAILURE", "生成服务返回格式异常");
    return content;
  } catch (error) {
    if (timedOut) throw new ServerError("DEADLINE_EXCEEDED", "生成超时");
    if (error instanceof ServerError) throw error;
    throw new ServerError("UPSTREAM_FAILURE", "生成服务暂时不可用");
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

export async function createGenerationProvider(
  env: Record<string, string | undefined> = process.env,
  supplied: Partial<GenerationProviderDependencies> = {},
  deadline?: number,
): Promise<GenerationProvider | null> {
  const dependencies: GenerationProviderDependencies = {
    fetch: supplied.fetch ?? globalThis.fetch,
    now: supplied.now ?? Date.now,
    execFile: supplied.execFile ?? defaultExecFile,
    isAbsolute: supplied.isAbsolute ?? isAbsolute,
    isFile:
      supplied.isFile ??
      (async (path) => {
        try {
          return (await stat(path)).isFile();
        } catch {
          return false;
        }
      }),
  };
  if (deadline !== undefined) remaining(deadline, dependencies.now);
  const ai = getAiChatConfig(env);
  if (ai) {
    return ({ prompt, deadline }) =>
      postChat(
        ai.endpoint,
        ai.apiKey,
        ai.model,
        prompt,
        deadline,
        dependencies,
      );
  }
  if (env.ZHIHU_GENERATION !== "1") return null;
  if (env.ZHIHU_ACCESS_SECRET) {
    return ({ prompt, deadline }) =>
      postChat(
        "https://developer.zhihu.com/v1/chat/completions",
        env.ZHIHU_ACCESS_SECRET!,
        "zhida-fast-1p5",
        prompt,
        deadline,
        dependencies,
        true,
      );
  }
  const cliPath = env.ZHIHU_CLI_PATH;
  const cliCheck = isVerifiedZhihuCli(cliPath, {
    isAbsolute: dependencies.isAbsolute,
    isFile: dependencies.isFile,
  });
  const validCli =
    deadline === undefined
      ? await cliCheck
      : await beforeDeadline(cliCheck, deadline, dependencies.now);
  if (deadline !== undefined) remaining(deadline, dependencies.now);
  if (!validCli || !cliPath) return null;
  return async ({ prompt, deadline }) => {
    const args = [
      "answer",
      "--query",
      prompt,
      "--model",
      "zhida-fast-1p5",
      "--timeout",
      "45s",
    ];
    if (windowsCommandLineLength(cliPath, args) > 32_767) {
      throw new ServerError(
        "BAD_REQUEST",
        "材料过长，无法传给本地知乎工具；请缩短材料或配置直接模型",
      );
    }
    try {
      const result = await dependencies.execFile(cliPath, args, {
        shell: false,
        timeout: remaining(deadline, dependencies.now),
        maxBuffer: 128 * 1024,
        windowsHide: true,
      });
      if (Buffer.byteLength(result.stdout, "utf8") > 128 * 1024)
        throw new ServerError("UPSTREAM_FAILURE", "生成服务返回过大");
      const body = JSON.parse(result.stdout) as {
        choices?: Array<{ message?: { content?: unknown } }>;
      };
      const content = body?.choices?.[0]?.message?.content;
      if (typeof content !== "string") throw new Error("shape");
      return content;
    } catch (error) {
      if (error instanceof ServerError) throw error;
      throw new ServerError("UPSTREAM_FAILURE", "生成服务暂时不可用");
    }
  };
}
