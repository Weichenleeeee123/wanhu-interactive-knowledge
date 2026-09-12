import { describe, expect, it, vi } from "vitest";
import type { Source } from "../src/lib/lesson";
import { getCapabilities } from "../src/lib/server/capabilities";
import {
  generateLesson,
  type GenerationProvider,
} from "../src/lib/server/generate";
import { createGenerationProvider } from "../src/lib/server/generation-provider";
import { FixedWindowLimiter } from "../src/lib/server/rate-limit";
import { searchZhihu, type SearchDependencies } from "../src/lib/server/search";
import { readJsonBody } from "../src/lib/server/request";
import { readBoundedText } from "../src/lib/server/bounded-response";
import { ServerError } from "../src/lib/server/errors";
import { errorResponse } from "../src/lib/server/responses";

const source: Source = {
  id: "42",
  title: "为什么换门胜率是三分之二？",
  author: "知乎用户",
  url: "https://www.zhihu.com/question/1/answer/42?utm_source=workshop",
  excerpt: "主持人知道奖品的位置，并且总会打开一扇没有奖品的门。",
};

const validLesson = {
  version: 1,
  title: "三门问题",
  intro: "通过重复试验观察换门策略的胜率。",
  goal: "比较坚持与换门两种策略。",
  prediction: "先预测哪种策略更容易获胜。",
  observation: "运行一千次后比较两种策略的获胜次数。",
  explanation: "第一次选择命中的概率是三分之一，换门继承了其余三分之二的概率。",
  challenge: "改变试验次数，观察结果如何逐渐稳定。",
  origin: "ai",
  experiment: { type: "monty-hall", trials: 1000 },
  sources: [source],
  sourceIds: ["42"],
};

describe("Zhihu search adapter", () => {
  it("maps official fields, preserves UTM links, truncates excerpts, and caps count", async () => {
    const fetch = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toContain("Query=%E6%A2%AF%E5%BA%A6%E4%B8%8B%E9%99%8D");
      expect(url).toContain("Count=10");
      expect(new Headers(init?.headers).get("Authorization")).toBe(
        "Bearer secret",
      );
      expect(new Headers(init?.headers).get("X-Request-Timestamp")).toBe(
        "1700000000",
      );
      return new Response(
        JSON.stringify({
          Code: 0,
          Data: {
            Items: [
              {
                Title: "标题",
                AuthorName: "作者",
                ContentText: "摘".repeat(1300),
                Url: "https://www.zhihu.com/question/1?utm_source=demo",
                ContentID: 123,
              },
            ],
          },
        }),
      );
    });
    const deps: SearchDependencies = {
      fetch,
      now: () => 1_700_000_000_999,
      env: { ZHIHU_ACCESS_SECRET: "secret" },
    };

    const items = await searchZhihu("梯度下降", 99, deps);

    expect(items).toEqual([
      {
        id: "123",
        title: "标题",
        author: "作者",
        excerpt: "摘".repeat(1200),
        url: "https://www.zhihu.com/question/1?utm_source=demo",
      },
    ]);
  });

  it("distinguishes a legitimate empty result from an upstream failure", async () => {
    const empty = await searchZhihu("没有结果", 5, {
      fetch: async () =>
        new Response(JSON.stringify({ Code: 0, Data: { Items: [] } })),
      now: () => 0,
      env: { ZHIHU_ACCESS_SECRET: "s" },
    });
    expect(empty).toEqual([]);

    await expect(
      searchZhihu("失败", 5, {
        fetch: async () =>
          new Response(
            JSON.stringify({ Code: 401, Message: "secret should not escape" }),
          ),
        now: () => 0,
        env: { ZHIHU_ACCESS_SECRET: "s" },
      }),
    ).rejects.toMatchObject({ code: "UPSTREAM_FAILURE" });
  });

  it("uses the verified CLI with argv and no shell when direct credentials are absent", async () => {
    const execFile = vi.fn(async () => ({
      stdout: JSON.stringify({ Code: 0, Data: { Items: [] } }),
    }));
    await expect(
      searchZhihu("测试", 5, {
        fetch: vi.fn(),
        now: () => 0,
        env: {
          ZHIHU_CLI_PATH:
            "C:\\Users\\Weichen Li\\AppData\\Local\\ZhihuCLI\\current\\zhihu-cli.exe",
        },
        isAbsolute: () => true,
        isFile: async () => true,
        execFile,
      }),
    ).resolves.toEqual([]);
    expect(execFile).toHaveBeenCalledWith(
      "C:\\Users\\Weichen Li\\AppData\\Local\\ZhihuCLI\\current\\zhihu-cli.exe",
      ["search", "zhihu", "--query", "测试", "--count", "5"],
      expect.objectContaining({ shell: false }),
    );
  });

  it("aborts and rejects a direct search fetch that exceeds the shared deadline", async () => {
    let signal: AbortSignal | undefined;
    const fetch = vi.fn((_url: string, init?: RequestInit) => {
      signal = init?.signal ?? undefined;
      return new Promise<Response>(() => undefined);
    });
    await expect(
      searchZhihu("超时", 5, {
        fetch,
        now: Date.now,
        env: { ZHIHU_ACCESS_SECRET: "secret" },
        deadline: Date.now() + 10,
      }),
    ).rejects.toMatchObject({ code: "DEADLINE_EXCEEDED" });
    expect(signal?.aborted).toBe(true);
  });

  it("classifies an abort-aware fetch deadline as a timeout", async () => {
    const fetch = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("aborted", "AbortError")),
            { once: true },
          );
        }),
    );
    await expect(
      searchZhihu("超时", 5, {
        fetch,
        now: Date.now,
        env: { ZHIHU_ACCESS_SECRET: "secret" },
        deadline: Date.now() + 10,
      }),
    ).rejects.toMatchObject({ code: "DEADLINE_EXCEEDED" });
  });

  it("cancels a stalled direct search response body at the shared deadline", async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true;
      },
    });
    await expect(
      searchZhihu("响应超时", 5, {
        fetch: async () => new Response(body),
        now: Date.now,
        env: { ZHIHU_ACCESS_SECRET: "secret" },
        deadline: Date.now() + 10,
      }),
    ).rejects.toMatchObject({ code: "DEADLINE_EXCEEDED" });
    expect(cancelled).toBe(true);
  });

  it("keeps CLI search within the same total deadline", async () => {
    await expect(
      searchZhihu("CLI超时", 5, {
        fetch: vi.fn(),
        now: Date.now,
        env: {
          ZHIHU_CLI_PATH:
            "C:\\Users\\Weichen Li\\AppData\\Local\\ZhihuCLI\\current\\zhihu-cli.exe",
        },
        isAbsolute: () => true,
        isFile: async () => true,
        execFile: async () => new Promise(() => undefined),
        deadline: Date.now() + 10,
      }),
    ).rejects.toMatchObject({ code: "DEADLINE_EXCEEDED" });
  });

  it("bounds CLI path verification within the search deadline", async () => {
    await expect(
      searchZhihu("CLI检查超时", 5, {
        fetch: vi.fn(),
        now: Date.now,
        env: {
          ZHIHU_CLI_PATH:
            "C:\\Users\\Weichen Li\\AppData\\Local\\ZhihuCLI\\current\\zhihu-cli.exe",
        },
        isAbsolute: () => true,
        isFile: async () => new Promise(() => undefined),
        execFile: vi.fn(),
        deadline: Date.now() + 10,
      }),
    ).rejects.toMatchObject({ code: "DEADLINE_EXCEEDED" });
  });

  it("cancels a direct search error response without reading its body", async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true;
      },
    });
    await expect(
      searchZhihu("失败", 5, {
        fetch: async () => new Response(body, { status: 503 }),
        now: Date.now,
        env: { ZHIHU_ACCESS_SECRET: "secret" },
      }),
    ).rejects.toMatchObject({ code: "UPSTREAM_FAILURE" });
    expect(cancelled).toBe(true);
  });
});

describe("generation adapter", () => {
  it("requires explicit standard-model consent before invoking a provider", async () => {
    const provider = vi.fn<GenerationProvider>();
    const result = await generateLesson(
      {
        mode: "learn",
        material: "足够的材料内容",
        question: "",
        sources: [],
        standardModel: false,
      },
      { provider },
    );
    expect(result).toMatchObject({ unsupported: true });
    expect(provider).not.toHaveBeenCalled();
  });

  it("strips an outer markdown fence and restores trusted source metadata", async () => {
    const altered = {
      ...validLesson,
      sources: [
        {
          ...source,
          title: "模型改写的标题",
          author: "模型作者",
          excerpt: "模型摘要",
        },
      ],
    };
    const provider = vi
      .fn<GenerationProvider>()
      .mockResolvedValue("```json\n" + JSON.stringify(altered) + "\n```");
    const result = await generateLesson(
      {
        mode: "teach",
        material: "三门问题材料",
        question: "为什么要换门？",
        sources: [source],
        standardModel: true,
      },
      { provider },
    );
    expect(result).toEqual({ lesson: validLesson, reason: "" });
    const prompt = provider.mock.calls[0][0].prompt;
    expect(prompt).toContain(source.excerpt);
    expect(prompt).toContain("不可信证据开始");
    expect(prompt).toContain('"sourceIds":["42"]');
    expect(prompt).toContain(
      '"experiment":{"type":"gradient-descent","initialX":0,"learningRate":0.2}',
    );
    expect(prompt).toContain(
      '"experiment":{"type":"monty-hall","trials":1000}',
    );
    expect(prompt).toContain("learningRate 为 0.02 至 1.2，步长 0.01");
  });

  it("assigns origin on the server when the provider omits it", async () => {
    const { origin: _origin, ...withoutOrigin } = validLesson;
    const provider = vi
      .fn<GenerationProvider>()
      .mockResolvedValue(JSON.stringify(withoutOrigin));
    await expect(
      generateLesson(
        {
          mode: "teach",
          material: "材料",
          question: "",
          sources: [source],
          standardModel: true,
        },
        { provider },
      ),
    ).resolves.toEqual({ lesson: validLesson, reason: "" });
  });

  it("rejects invented source IDs and changed source URLs", async () => {
    const inventedId = {
      ...validLesson,
      sources: [{ ...source, id: "invented" }],
      sourceIds: ["invented"],
    };
    const provider = vi
      .fn<GenerationProvider>()
      .mockResolvedValue(JSON.stringify(inventedId));
    await expect(
      generateLesson(
        {
          mode: "teach",
          material: "材料",
          question: "",
          sources: [source],
          standardModel: true,
        },
        { provider },
      ),
    ).rejects.toMatchObject({ code: "INVALID_PROVIDER_OUTPUT" });

    const changedUrl = {
      ...validLesson,
      sources: [{ ...source, url: "https://example.com/fake" }],
    };
    provider.mockResolvedValueOnce(JSON.stringify(changedUrl));
    await expect(
      generateLesson(
        {
          mode: "teach",
          material: "材料",
          question: "",
          sources: [source],
          standardModel: true,
        },
        { provider },
      ),
    ).rejects.toMatchObject({ code: "INVALID_PROVIDER_OUTPUT" });
  });

  it("returns provider unsupported decisions and repairs structured validation only once", async () => {
    const unsupported = vi
      .fn<GenerationProvider>()
      .mockResolvedValue(
        JSON.stringify({ unsupported: true, reason: "材料与可用实验无关" }),
      );
    await expect(
      generateLesson(
        {
          mode: "learn",
          material: "诗歌赏析",
          question: "",
          sources: [],
          standardModel: true,
        },
        { provider: unsupported },
      ),
    ).resolves.toEqual({ unsupported: true, reason: "材料与可用实验无关" });

    const provider = vi
      .fn<GenerationProvider>()
      .mockResolvedValueOnce('{"version":1}')
      .mockResolvedValueOnce(JSON.stringify(validLesson));
    await expect(
      generateLesson(
        {
          mode: "teach",
          material: "材料",
          question: "",
          sources: [source],
          standardModel: true,
        },
        { provider },
      ),
    ).resolves.toEqual({ lesson: validLesson, reason: "" });
    expect(provider).toHaveBeenCalledTimes(2);
    expect(provider.mock.calls[1][0].repair).toBe(true);
  });

  it("does not retry network failures and enforces one total deadline", async () => {
    const failure = Object.assign(new Error("raw provider detail"), {
      code: "UPSTREAM_FAILURE",
    });
    const provider = vi.fn<GenerationProvider>().mockRejectedValue(failure);
    await expect(
      generateLesson(
        {
          mode: "teach",
          material: "材料",
          question: "",
          sources: [],
          standardModel: true,
        },
        { provider },
      ),
    ).rejects.toMatchObject({
      code: "UPSTREAM_FAILURE",
      message: "生成服务暂时不可用",
    });
    expect(provider).toHaveBeenCalledTimes(1);
    expect(provider.mock.calls[0][0].deadline).toBeGreaterThan(0);
  });

  it("rejects a valid provider result returned after the shared deadline", async () => {
    let clock = 1_000;
    const provider = vi
      .fn<GenerationProvider>()
      .mockImplementation(async () => {
        clock = 46_001;
        return JSON.stringify(validLesson);
      });
    await expect(
      generateLesson(
        {
          mode: "teach",
          material: "材料",
          question: "",
          sources: [source],
          standardModel: true,
        },
        { provider, now: () => clock, deadline: 46_000 },
      ),
    ).rejects.toMatchObject({ code: "DEADLINE_EXCEEDED" });
    expect(provider).toHaveBeenCalledTimes(1);
  });

  it("checks the deadline again immediately before accepting validated output", async () => {
    const times = [1_000, 45_999, 46_001];
    const provider = vi
      .fn<GenerationProvider>()
      .mockResolvedValue(JSON.stringify(validLesson));
    await expect(
      generateLesson(
        {
          mode: "teach",
          material: "材料",
          question: "",
          sources: [source],
          standardModel: true,
        },
        { provider, now: () => times.shift() ?? 46_001, deadline: 46_000 },
      ),
    ).rejects.toMatchObject({ code: "DEADLINE_EXCEEDED" });
  });
});

describe("generation provider transport", () => {
  it("adds the required seconds timestamp only to direct Zhihu generation", async () => {
    const fetch = vi.fn(async (_url: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("Authorization")).toBe("Bearer zhihu-secret");
      expect(headers.get("X-Request-Timestamp")).toBe("1700000000");
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: { content: '{"unsupported":true,"reason":"材料不足"}' },
            },
          ],
        }),
      );
    });
    const provider = await createGenerationProvider(
      { ZHIHU_GENERATION: "1", ZHIHU_ACCESS_SECRET: "zhihu-secret" },
      { fetch, now: () => 1_700_000_000_999 },
    );
    await expect(
      provider!({
        prompt: "prompt",
        repair: false,
        deadline: 1_700_000_010_000,
      }),
    ).resolves.toContain("unsupported");
    expect(fetch).toHaveBeenCalledWith(
      "https://developer.zhihu.com/v1/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Request-Timestamp": "1700000000",
        }),
      }),
    );

    const aiFetch = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("X-Request-Timestamp")).toBeNull();
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: { content: '{"unsupported":true,"reason":"材料不足"}' },
            },
          ],
        }),
      );
    });
    const aiProvider = await createGenerationProvider(
      {
        AI_BASE_URL: "https://ai.example/v1",
        AI_MODEL: "model",
        AI_API_KEY: "ai-key",
      },
      { fetch: aiFetch, now: () => 1_700_000_000_999 },
    );
    await aiProvider!({
      prompt: "prompt",
      repair: false,
      deadline: 1_700_000_010_000,
    });
  });

  it("cancels and rejects a provider response that exceeds the byte bound", async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array(70_000));
        controller.enqueue(new Uint8Array(70_000));
      },
      cancel() {
        cancelled = true;
      },
    });
    const provider = await createGenerationProvider(
      {
        AI_BASE_URL: "https://ai.example/v1",
        AI_MODEL: "model",
        AI_API_KEY: "key",
      },
      { fetch: async () => new Response(stream), now: () => 1_000 },
    );
    await expect(
      provider!({ prompt: "prompt", repair: false, deadline: 10_000 }),
    ).rejects.toMatchObject({ code: "UPSTREAM_FAILURE" });
    expect(cancelled).toBe(true);
  });

  it("cancels a stalled provider response body at the generation deadline", async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true;
      },
    });
    const provider = await createGenerationProvider(
      {
        AI_BASE_URL: "https://ai.example/v1",
        AI_MODEL: "model",
        AI_API_KEY: "key",
      },
      { fetch: async () => new Response(body), now: Date.now },
    );
    await expect(
      provider!({ prompt: "prompt", repair: false, deadline: Date.now() + 10 }),
    ).rejects.toMatchObject({ code: "DEADLINE_EXCEEDED" });
    expect(cancelled).toBe(true);
  });

  it("cancels a non-success provider response body", async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true;
      },
    });
    const provider = await createGenerationProvider(
      {
        AI_BASE_URL: "https://ai.example/v1",
        AI_MODEL: "model",
        AI_API_KEY: "key",
      },
      { fetch: async () => new Response(body, { status: 500 }), now: Date.now },
    );
    await expect(
      provider!({
        prompt: "prompt",
        repair: false,
        deadline: Date.now() + 1_000,
      }),
    ).rejects.toMatchObject({ code: "UPSTREAM_FAILURE" });
    expect(cancelled).toBe(true);
  });

  it("rejects an oversized quoted Windows CLI command before spawning", async () => {
    const execFile = vi.fn(async () => ({ stdout: "" }));
    const provider = await createGenerationProvider(
      {
        ZHIHU_GENERATION: "1",
        ZHIHU_CLI_PATH:
          "C:\\Users\\Weichen Li\\AppData\\Local\\ZhihuCLI\\current\\zhihu-cli.exe",
      },
      {
        fetch: vi.fn(),
        now: Date.now,
        execFile,
        isAbsolute: () => true,
        isFile: async () => true,
      },
    );
    await expect(
      provider!({
        prompt: 'a"\\'.repeat(12_000),
        repair: false,
        deadline: Date.now() + 1_000,
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringMatching(/缩短|直接模型/),
    });
    expect(execFile).not.toHaveBeenCalled();
  });

  it("bounds CLI provider verification within the whole generation deadline", async () => {
    await expect(
      createGenerationProvider(
        {
          ZHIHU_GENERATION: "1",
          ZHIHU_CLI_PATH:
            "C:\\Users\\Weichen Li\\AppData\\Local\\ZhihuCLI\\current\\zhihu-cli.exe",
        },
        {
          fetch: vi.fn(),
          now: Date.now,
          execFile: vi.fn(),
          isAbsolute: () => true,
          isFile: async () => new Promise(() => undefined),
        },
        Date.now() + 10,
      ),
    ).rejects.toMatchObject({ code: "DEADLINE_EXCEEDED" });
  });

  it("returns the safe actionable CLI length error to the caller", async () => {
    const response = errorResponse(
      new ServerError(
        "BAD_REQUEST",
        "材料过长，无法传给本地知乎工具；请缩短材料或配置直接模型",
      ),
    );
    await expect(response.json()).resolves.toEqual({
      error: "材料过长，无法传给本地知乎工具；请缩短材料或配置直接模型",
    });
  });
});

describe("server safety boundaries", () => {
  it("reports honest capabilities when providers are absent", async () => {
    await expect(
      getCapabilities(
        {},
        { isFile: async () => false, isAbsolute: () => false },
      ),
    ).resolves.toEqual({
      search: false,
      generation: false,
      provider: "unconfigured",
    });
  });

  it("does not advertise an AI provider with an invalid base URL", async () => {
    await expect(
      getCapabilities(
        { AI_BASE_URL: "not a url", AI_MODEL: "model", AI_API_KEY: "key" },
        {
          isFile: async () => false,
          isAbsolute: () => false,
        },
      ),
    ).resolves.toEqual({
      search: false,
      generation: false,
      provider: "unconfigured",
    });
  });

  it("falls back to enabled Zhihu generation when a complete AI config has an invalid URL", async () => {
    const env = {
      AI_BASE_URL: "not a url",
      AI_MODEL: "model",
      AI_API_KEY: "ai-key",
      ZHIHU_GENERATION: "1",
      ZHIHU_ACCESS_SECRET: "zhihu-key",
    };
    await expect(
      getCapabilities(env, {
        isFile: async () => false,
        isAbsolute: () => false,
      }),
    ).resolves.toEqual({ search: true, generation: true, provider: "zhihu" });
    await expect(
      createGenerationProvider(env, { fetch: vi.fn(), now: () => 1_000 }),
    ).resolves.toEqual(expect.any(Function));
  });

  it("rejects request bodies above 128 KiB before parsing", async () => {
    const request = new Request("http://local/api/generate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": "131073",
      },
      body: "{}",
    });
    await expect(readJsonBody(request)).rejects.toMatchObject({
      code: "PAYLOAD_TOO_LARGE",
    });
  });

  it("cancels a provider body rejected by declared content length", async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true;
      },
    });
    const response = new Response(body, {
      headers: { "content-length": "129" },
    });
    await expect(readBoundedText(response, 128)).rejects.toMatchObject({
      code: "UPSTREAM_FAILURE",
    });
    expect(cancelled).toBe(true);
  });

  it("cancels an overflowing streamed request body", async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array(80));
        controller.enqueue(new Uint8Array(80));
      },
      cancel() {
        cancelled = true;
      },
    });
    const request = new Request("http://local/api/generate", {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit);
    await expect(readJsonBody(request, 128)).rejects.toMatchObject({
      code: "PAYLOAD_TOO_LARGE",
    });
    expect(cancelled).toBe(true);
  });

  it("cancels a stalled request body when the whole-request deadline expires", async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true;
      },
    });
    const request = new Request("http://local/api/generate", {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit);
    await expect(
      readJsonBody(request, 128, Date.now() + 10),
    ).rejects.toMatchObject({ code: "DEADLINE_EXCEEDED" });
    expect(cancelled).toBe(true);
  });

  it("limits generation to five requests per ten-minute window", () => {
    const limiter = new FixedWindowLimiter(5, 600_000);
    for (let i = 0; i < 5; i++) expect(limiter.take("global", 1000)).toBe(true);
    expect(limiter.take("global", 1000)).toBe(false);
    expect(limiter.take("global", 601_001)).toBe(true);
  });

  it("bounds identity storage and reclaims expired rate-limit keys", () => {
    const limiter = new FixedWindowLimiter(1, 100, 2);
    expect(limiter.take("client-a", 1_000)).toBe(true);
    expect(limiter.take("client-b", 1_000)).toBe(true);
    expect(limiter.take("client-c", 1_000)).toBe(false);
    expect(limiter.take("client-c", 1_101)).toBe(true);
    expect(limiter.take("client-a", 1_101)).toBe(true);
    expect(limiter.take("client-d", 1_101)).toBe(false);
  });
});
