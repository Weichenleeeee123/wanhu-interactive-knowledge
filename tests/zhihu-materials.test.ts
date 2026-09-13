import { expect, it, vi } from "vitest";
import {
  plainText,
  parseZhihuLink,
  createKnowledgeClient,
  resolveZhihuLink,
} from "../src/lib/zhihu-materials";
it("preserves comparison operators while decoding actual HTML paragraphs", () => {
  expect(plainText("当 x<p 且 y>5 时执行操作。")).toBe(
    "当 x<p 且 y>5 时执行操作。",
  );
  expect(plainText("当 x < 3 且 y > 5 时执行操作。")).toBe(
    "当 x < 3 且 y > 5 时执行操作。",
  );
  expect(
    plainText(
      "<p>第一段 <strong>要点</strong></p><p>x &lt; 3</p><script>alert(1)</script>",
    ),
  ).toBe("第一段 要点\n\nx < 3");
});
it("accepts known content paths and rejects lookalike hosts, credentials and path injection", () => {
  expect(
    parseZhihuLink("https://zhuanlan.zhihu.com/p/123?utm_source=test"),
  ).toMatchObject({ id: "123", type: "article" });
  expect(
    parseZhihuLink("https://www.zhihu.com/question/1/answer/42"),
  ).toMatchObject({ id: "42", type: "answer" });
  for (const url of [
    "https://zhihu.com.evil.test/p/1",
    "https://www.zhihu.com@127.0.0.1/question/1",
    "http://127.0.0.1/",
    "https://api.zhihu.com/anything",
    "https://zhuanlan.zhihu.com:9443/p/1",
  ])
    expect(() => parseZhihuLink(url)).toThrow();
});
it("imports official body and author, caches requests and only fetches IDs in the official list", async () => {
  const fetcher = vi.fn(
    async (url: string) =>
      new Response(
        JSON.stringify(
          url.endsWith("/list")
            ? [
                {
                  work_id: "123",
                  title: "真实知识标题",
                  description: "简介",
                  labels: [],
                },
              ]
            : {
                work_id: "123",
                chapter_name: "真实知识标题",
                author_name: "原作者",
                content: "第一段正文。\n\n第二段正文。",
              },
        ),
      ),
  );
  const client = createKnowledgeClient(fetcher);
  const material = await client.detail("123");
  await client.detail("123");
  expect(material.text).toContain("第二段正文");
  expect(material.source.author).toBe("原作者");
  expect(material.coverage).toBe("official-body");
  expect(fetcher).toHaveBeenCalledTimes(2);
  await expect(client.detail("../123")).rejects.toThrow();
  await expect(client.detail("456")).rejects.toThrow();
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("only matches the requested content, never substitutes a related search result", async () => {
  const search = vi.fn(async () => [
    {
      id: "9",
      title: "另一篇文章",
      author: "",
      url: "https://zhuanlan.zhihu.com/p/9",
      excerpt: "无关结果",
    },
  ]);
  const result = await resolveZhihuLink(
    "https://zhuanlan.zhihu.com/p/123",
    search,
  );
  expect(result.coverage).toBe("link-only");
  expect(result.text).toBe("");
  expect(result.source.url).toContain("/123");
});
it("labels matched search content as an excerpt, not a full article", async () => {
  const result = await resolveZhihuLink(
    "https://www.zhihu.com/question/1/answer/42",
    async () => [
      {
        id: "42",
        title: "相关原文",
        author: "原作者",
        url: "https://www.zhihu.com/question/1/answer/42?utm_source=official",
        excerpt: "检索摘要",
      },
    ],
  );
  expect(result.coverage).toBe("search-excerpt");
  expect(result.text).toBe("检索摘要");
  expect(result.source.url).toContain("utm_source=official");
});
