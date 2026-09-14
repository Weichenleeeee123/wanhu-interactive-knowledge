import { test, expect } from "@playwright/test";

test("browser Back retains unsaved content as a recoverable session copy", async ({
  page,
}) => {
  await page.goto("/create?example=monty-hall");
  await expect(page.getByLabel("作品标题")).toBeVisible();
  await page.goto("/library");
  await expect(
    page.getByRole("link", { name: "继续编辑 →", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "继续编辑 →", exact: true }).click();
  await expect(page.getByLabel("作品标题")).toBeVisible();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("wanhu."))
        throw new DOMException("容量已满", "QuotaExceededError");
      original.call(this, key, value);
    };
  });
  await page.getByLabel("作品标题").click();
  await page.getByLabel("作品标题").fill("按后退也不能丢的修改");
  await expect(
    page.getByRole("alert").filter({ hasText: "容量已满" }),
  ).toBeVisible();
  await page.evaluate(() => history.back());
  await expect(page).toHaveURL(/\/library$/);
  const recovered = page
    .locator(".library-recovery>div")
    .filter({ hasText: "按后退也不能丢的修改" });
  await expect(recovered).toContainText("尚未保存");
  await recovered.getByRole("link", { name: "恢复为新作品" }).click();
  await expect(page.getByLabel("作品标题")).toHaveValue("按后退也不能丢的修改");
});

test("authors add and remove citations without regenerating the lesson", async ({
  page,
}) => {
  await page.goto("/create?example=monty-hall");
  const title = await page.getByLabel("作品标题").inputValue();
  await page.locator(".editor-field-section summary").filter({hasText:"核对材料与出处"}).click();
  await page.getByText("＋ 添加引用来源", { exact: true }).click();
  await page.getByLabel("引用来源标题").fill("作者补充的原始出处");
  await page
    .getByLabel("引用来源链接")
    .fill("https://www.zhihu.com/question/100");
  await page.getByLabel("引用来源作者（可选）").fill("原作者");
  await page.getByRole("button", { name: "添加并关联到讲解" }).click();
  const source = page
    .locator(".editor-source")
    .filter({ hasText: "作者补充的原始出处" });
  await expect(source.getByLabel(/来源作者/)).toHaveValue("原作者");
  await expect(page.getByLabel("作品标题")).toHaveValue(title);
  await source.getByRole("button", { name: "移出当前作品" }).click();
  await expect(source).toHaveCount(0);
  await page.getByRole("button", { name: "↶ 撤销", exact: true }).click();
  await expect(source.getByLabel(/来源作者/)).toHaveValue("原作者");
  await page.reload();
  await page.locator(".editor-field-section summary").filter({hasText:"核对材料与出处"}).click();
  await expect(source.getByLabel(/来源作者/)).toHaveValue("原作者");
});

test("a preserved recovery record opens as a new work without replacing the latest one", async ({
  page,
}) => {
  await page.goto("/create?example=monty-hall");
  await page.getByLabel("作品标题").fill("刷新前的版本");
  const original = page.url();
  await page.reload();
  await page.getByLabel("作品标题").fill("当前的最新版本");
  await page.goto("/library");
  await page.getByText(/份可恢复的历史记录/).click();
  await page.getByRole("link", { name: "恢复为新作品" }).first().click();
  await expect(page.getByLabel("作品标题")).toHaveValue("刷新前的版本");
  expect(page.url()).not.toBe(original);
  await page.goto(original);
  await expect(page.getByLabel("作品标题")).toHaveValue("当前的最新版本");
});

test("unavailable storage keeps edits in memory, offers a backup and guards leaving", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("wanhu."))
        throw new DOMException("本机容量已满", "QuotaExceededError");
      original.call(this, key, value);
    };
  });
  await page.goto("/create?example=monty-hall");
  await page.getByLabel("作品标题").fill("存储失败时的内容");
  await expect(
    page.getByRole("alert").filter({ hasText: "本机容量已满" }),
  ).toBeVisible();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载当前备份" }).click();
  const downloaded = await pending;
  await downloaded.saveAs(testInfo.outputPath("failed-save-backup.json"));
  const url = page.url();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("link", { name: "我的作品", exact: true })
    .first()
    .click();
  expect(page.url()).toBe(url);
  await expect(page.getByLabel("作品标题")).toHaveValue("存储失败时的内容");
  await page.getByRole("button", { name: "01 素材与问题" }).click();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "梯度下降 →", exact: true }).click();
  await page.getByRole("button", { name: "02 调整讲解" }).click();
  await expect(page.getByLabel("作品标题")).toHaveValue("存储失败时的内容");
});

test("materials and selected sources survive refresh, with multiple independent works", async ({
  page,
}) => {
  await page.route("**/api/capabilities", (route) =>
    route.fulfill({
      json: { search: true, generation: true, provider: "test" },
    }),
  );
  await page.route("**/api/search?*", (route) =>
    route.fulfill({
      json: {
        items: [
          {
            id: "a",
            title: "一份知乎材料",
            author: "测试作者",
            url: "https://www.zhihu.com/question/1",
            excerpt: "测试用的摘要",
          },
        ],
      },
    }),
  );
  await page.goto("/create");
  await page.getByLabel("想讲清楚的问题").fill("第一份独立问题");
  await page
    .getByLabel("补充你的讲解材料")
    .fill("还没有生成的原始段落，也应该保存。");
  await page.locator(".advanced-material summary").first().click();
  await page.getByLabel("知乎搜索关键词").fill("我的关键词");
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await page.getByRole("checkbox", { name: "一份知乎材料" }).check();
  const first = page.url();
  expect(first).toContain("?work=");
  await page.reload();
  await expect(page.getByLabel("想讲清楚的问题")).toHaveValue("第一份独立问题");
  await expect(page.getByLabel("补充你的讲解材料")).toHaveValue(
    "还没有生成的原始段落，也应该保存。",
  );
  await page.locator(".advanced-material summary").first().click();
  await expect(
    page.getByRole("button", { name: "一份知乎材料" }),
  ).toBeVisible();
  await page.goto("/create?mode=learn");
  await page.getByLabel("我不理解的地方").fill("第二份独立问题");
  await page
    .getByRole("link", { name: "我的作品", exact: true })
    .first()
    .click();
  await expect(page.locator(".work-card")).toHaveCount(2);
  await page.getByRole("button", { name: /我的学习/ }).click();
  await expect(page.locator(".work-card")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "第二份独立问题" }),
  ).toBeVisible();
  await page.goto(first);
  await expect(page.getByLabel("补充你的讲解材料")).toHaveValue(
    "还没有生成的原始段落，也应该保存。",
  );
});

test("undo, redo, incomplete draft recovery and independent copies", async ({
  page,
}) => {
  await page.goto("/create?example=monty-hall");
  const title = await page.getByLabel("作品标题").inputValue();
  await page.getByLabel("作品标题").fill("我改过的讲解");
  await page.getByRole("button", { name: "↶ 撤销", exact: true }).click();
  await expect(page.getByLabel("作品标题")).toHaveValue(title);
  await page.getByRole("button", { name: "↷ 重做", exact: true }).click();
  await expect(page.getByLabel("作品标题")).toHaveValue("我改过的讲解");
  await page.getByLabel("作品标题").fill("");
  await page.reload();
  await expect(page.getByLabel("作品标题")).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "发布到知乎文章", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("作品标题").fill("原作品");
  const original = page.url();
  await page.locator(".work-more:not([open]) summary").click();
  await page.getByRole("button", { name: "另存副本", exact: true }).click();
  await expect(page.getByLabel("作品标题")).toHaveValue("原作品 · 副本");
  await page.getByLabel("作品标题").fill("独立编辑的副本");
  await page.goto(original);
  await expect(page.getByLabel("作品标题")).toHaveValue("原作品");
});

test("workspace backups restore original materials to a new work", async ({
  page,
}, testInfo) => {
  await page.goto("/create");
  await page.getByLabel("想讲清楚的问题").fill("备份里的问题");
  await page
    .getByLabel("补充你的讲解材料")
    .fill("需要跨设备继续整理的原始材料");
  const original = page.url();
  const pending = page.waitForEvent("download");
  if(!await page.locator(".work-more").getAttribute("open").then(v=>v!==null))await page.locator(".work-more summary").click();
  await page.getByRole("button", { name: "备份素材与作品 ↓" }).click();
  const download = await pending;
  const path = testInfo.outputPath("workspace-backup.json");
  await download.saveAs(path);
  await page.goto("/create");
  await page.getByLabel("导入 JSON 作品").setInputFiles(path);
  await expect(page.getByLabel("想讲清楚的问题")).toHaveValue("备份里的问题");
  await expect(page.getByLabel("补充你的讲解材料")).toHaveValue(
    "需要跨设备继续整理的原始材料",
  );
  expect(page.url()).not.toBe(original);
  await page.goto("/library");
  await expect(page.locator(".work-card")).toHaveCount(2);
});

test("a reader can save a separate editable learning copy", async ({
  page,
}) => {
  await page.goto("/view?example=gradient-descent");
  await page
    .getByRole("button", { name: "＋ 保存这份阅读", exact: true })
    .click();
  await page.getByRole("link", { name: "已保存 · 继续理解 ↗" }).click();
  await expect(page.getByLabel("作品标题")).toHaveCount(0);
  await expect(page.getByRole("heading",{name:"从不理解的地方，开始探索。"})).toBeVisible();
  await page
    .getByRole("link", { name: "我的作品", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: /我的学习/ }).click();
  await expect(page.locator(".work-card")).toHaveCount(1);
});

test("a stale tab cannot silently replace another tab; duplicate recovers its edits", async ({
  page,
  context,
}) => {
  await page.goto("/create?example=monty-hall");
  await expect(page.getByLabel("作品标题")).toBeVisible();
  const url = page.url();
  const other = await context.newPage();
  await other.goto(url);
  await expect(other.getByLabel("作品标题")).toBeVisible();
  await page.getByLabel("作品标题").fill("第一标签页的新版本");
  await other.getByLabel("作品标题").fill("第二标签页的修改");
  await expect(
    other.getByRole("alert").filter({ hasText: "其他标签页" }),
  ).toBeVisible();
  await other.locator(".work-more:not([open]) summary").click();
  await other.getByRole("button", { name: "另存副本", exact: true }).click();
  await expect(other.getByLabel("作品标题")).toHaveValue(
    "第二标签页的修改 · 副本",
  );
  await page.reload();
  await expect(page.getByLabel("作品标题")).toHaveValue("第一标签页的新版本");
});

test("the empty library and full creation workflow fit a 360px viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/library");
  await expect(
    page.getByRole("heading", { name: "先留住一个好问题。" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.goto("/create?example=monty-hall");
  await expect(page.getByLabel("作品标题")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.goto("/library");
  await expect(page.locator(".work-card")).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.getByLabel("搜索我的作品").fill("不存在的名字");
  await expect(
    page.getByRole("heading", { name: "没有找到这份作品" }),
  ).toBeVisible();
});
