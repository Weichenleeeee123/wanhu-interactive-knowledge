import { test, expect } from "@playwright/test";
import { articleText, articleSource, articleLesson } from "./article-fixture";
test("deleted imported paragraphs are not sent back through hidden source text", async ({
  page,
}) => {
  await page.route("**/api/capabilities", (route) =>
    route.fulfill({
      json: { search: true, generation: true, provider: "zhihu" },
    }),
  );
  await page.route("**/api/materials**", (route) =>
    route.fulfill({
      json: {
        material: {
          source: articleSource,
          text: articleText,
          coverage: "official-body",
          note: "正文材料",
        },
      },
    }),
  );
  let requestBody: Record<string, unknown> = {};
  await page.route("**/api/generate", (route) => {
    requestBody = route.request().postDataJSON();
    return route.fulfill({ json: { lesson: articleLesson, reason: "" } });
  });
  await page.goto("/create");
  await page
    .getByLabel("要导入的知乎链接")
    .fill("https://zhuanlan.zhihu.com/p/123");
  await page.getByRole("button", { name: "读取链接", exact: true }).click();
  await page.getByRole("button", { name: "带入所选材料与来源" }).click();
  const remaining = articleText.split("\n\n")[0];
  const removed = articleText.split("\n\n")[1];
  await page.getByLabel("补充你的讲解材料").fill(remaining);
  await page.getByRole("checkbox", { name: /生成后由我核对/ }).check();
  await page.getByRole("button", { name: "生成我的互动草稿 ↗" }).click();
  await expect(page.getByLabel("作品标题")).toHaveValue(articleLesson.title);
  expect(JSON.stringify(requestBody)).not.toContain(removed);
  expect(requestBody.sourceMaterials).toEqual([
    { sourceId: articleSource.id, text: remaining },
  ]);
});
test("Zhihu paragraphs append to a draft, survive editing and produce an interactive share in a fresh browser", async ({
  page,
  browser,
}) => {
  await page.route("**/api/capabilities", (route) =>
    route.fulfill({
      json: { search: true, generation: true, provider: "zhihu" },
    }),
  );
  await page.route("**/api/materials**", (route) =>
    route.fulfill({
      json: new URL(route.request().url()).searchParams.has("knowledge")
        ? {
            material: {
              source: articleSource,
              text: articleText,
              coverage: "official-body",
              note: "接口提供的正文材料，可能为节选。",
            },
          }
        : {
            items: [
              {
                id: "123",
                title: articleSource.title,
                description: "可开始的小步骤",
              },
            ],
          },
    }),
  );
  let generatedInput: Record<string, unknown> = {};
  await page.route("**/api/generate", (route) => {
    generatedInput = route.request().postDataJSON();
    return route.fulfill({ json: { lesson: articleLesson, reason: "" } });
  });
  await page.goto("/create?mode=teach");
  await page.getByLabel("补充你的讲解材料").fill("保留我的原始想法。");
  await page.getByRole("button", { name: "浏览知乎官方知识内容 →" }).click();
  await page
    .locator(".knowledge-item")
    .filter({ hasText: articleSource.title })
    .click();
  await expect(page.locator(".article-import-preview")).toContainText(
    "测试作者",
  );
  await page.getByRole("button", { name: "带入所选材料与来源" }).click();
  await expect(page.getByLabel("补充你的讲解材料")).toHaveValue(
    "保留我的原始想法。\n\n【来自：如何开始一个大任务】\n" + articleText,
  );
  await page.reload();
  expect(await page.getByLabel("补充你的讲解材料").inputValue()).toContain(
    articleText,
  );
  await page.getByRole("checkbox", { name: /生成后由我核对/ }).check();
  await page.getByRole("button", { name: "生成我的互动草稿 ↗" }).click();
  await expect(page.getByLabel("作品标题")).toHaveValue(articleLesson.title);
  expect(generatedInput.sources).toEqual([articleSource]);
  expect(generatedInput.sourceMaterials).toEqual([
    { sourceId: articleSource.id, text: articleText },
  ]);
  await page.locator(".editor-field-section summary").filter({hasText:"调整互动内容与参数"}).click();
  await page.locator(".reading-edit-card summary").first().click();
  await page.getByLabel("核心要点 1", { exact: true }).fill("");
  await page.reload();
  await page.locator(".editor-field-section summary").filter({hasText:"调整互动内容与参数"}).click();
  await page.locator(".reading-edit-card summary").first().click();
  await expect(page.getByLabel("核心要点 1", { exact: true })).toHaveValue("");
  await page.getByLabel("核心要点 1", { exact: true }).fill("把任务拆小");
  await page.locator(".editor-field-section summary").filter({hasText:"核对材料与出处"}).click();
  await expect(
    page
      .locator(".editor-source")
      .getByRole("button", { name: "移出当前作品" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "发布到知乎文章", exact: true }).click();
  const url = await page.getByLabel("发布到知乎文章的分享链接").inputValue();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const reader = await context.newPage();
  await reader.goto(url);
  await reader
    .getByRole("button", { name: "我还没弄明白", exact: true })
    .click();
  const trail = reader.getByLabel("原文互动阅读");
  await expect(trail).toContainText("把任务拆小");
  await trail.getByRole("button", { name: /先列出三个要点/ }).click();
  await expect(trail.locator("blockquote")).toContainText("把大任务拆成");
  await expect(
    trail.getByRole("link", { name: "核对知乎官方内容 ↗" }),
  ).toHaveAttribute("href", articleSource.url);
  await trail.getByRole("button", { name: "下一个情境 →" }).click();
  await trail.getByRole("button", { name: /记录进展并确定下一步/ }).click();
  await expect(reader.getByLabel("我的探索记录")).toContainText(
    "已理解各个情境中的表达",
  );
  expect(
    await reader.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await context.close();
});

test("normal Zhihu links clearly show summaries and missing bodies can retain editable attribution", async ({
  page,
}) => {
  await page.route("**/api/materials**", (route) => {
    const empty = route.request().url().includes("999");
    return route.fulfill({
      json: {
        material: {
          source: {
            ...articleSource,
            title: empty ? "待补充标题的知乎内容" : "知乎摘要标题",
            url: "https://zhuanlan.zhihu.com/p/" + (empty ? "999" : "123"),
            provenance: empty ? "user" : "zhihu-search",
            contentScope: empty ? "link-only" : "search-excerpt",
          },
          text: empty ? "" : articleText,
          coverage: empty ? "link-only" : "search-excerpt",
          note: empty ? "请粘贴你能阅读的关键段落。" : "当前带入的是搜索摘要。",
        },
      },
    });
  });
  await page.goto("/create");
  await page
    .getByLabel("要导入的知乎链接")
    .fill("https://zhuanlan.zhihu.com/p/123");
  await page.getByRole("button", { name: "读取链接", exact: true }).click();
  await expect(page.locator(".source-coverage")).toHaveText("知乎搜索摘要");
  await page.getByRole("button", { name: "带入所选材料与来源" }).click();
  await page
    .getByLabel("要导入的知乎链接")
    .fill("https://zhuanlan.zhihu.com/p/999");
  await page.getByRole("button", { name: "读取链接", exact: true }).click();
  await page.getByLabel("补充这篇内容的标题").fill("我的原文");
  await page.getByLabel("补充原作者（可选）").fill("作者乙");
  await page.getByRole("button", { name: "保留这个来源链接" }).click();
  await expect(page.getByLabel("补充你的讲解材料")).toHaveValue(articleText);
  await expect(
    page.locator(".source-chip").filter({ hasText: "我的原文" }),
  ).toBeVisible();
});
