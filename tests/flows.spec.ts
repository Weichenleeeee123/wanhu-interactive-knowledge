import { test, expect } from "@playwright/test";
test("gradient reader computes, challenges and resets", async ({ page }) => {
  await page.goto("/view?example=gradient-descent");
  await page.getByRole("button", { name: "单步前进" }).click();
  await expect(page.getByTestId("gradient-step")).toHaveText("1");
  await page.getByLabel("你的下一步位置").fill("4.8");
  await page.getByRole("button", { name: "验证答案" }).click();
  await expect(page.getByText("回答正确", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "重置实验" }).click();
  await expect(page.getByTestId("gradient-step")).toHaveText("0");
});
test("Monty reader plays and compares real trial counts", async ({ page }) => {
  await page.goto("/view?example=monty-hall");
  await page.getByRole("button", { name: "选择 1 号门" }).click();
  await page.getByRole("button", { name: "换一扇门" }).click();
  await expect(page.getByTestId("monty-result")).toBeVisible();
  await page.getByRole("button", { name: "运行 1000 次" }).click();
  await expect(page.getByTestId("batch-result")).toContainText("1000");
  await page.getByRole("button", { name: "2/3", exact: true }).click();
  await expect(page.getByText("回答正确", { exact: false })).toBeVisible();
});
test("creator edits a snapshot that opens in a fresh browser context", async ({
  page,
  browser,
}) => {
  await page.goto("/create?example=gradient-descent&mode=teach");
  await page.getByLabel("作品标题").fill("我的学习率实验");
  await page.getByRole("button", { name: "发布到知乎文章", exact: true }).click();
  const url = await page.getByLabel("发布到知乎文章的分享链接").inputValue();
  expect(url).toContain("/view#v1.");
  const context = await browser.newContext();
  const reader = await context.newPage();
  await reader.goto(url);
  await expect(
    reader.getByRole("heading", { name: "我的学习率实验", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("作品标题")).toHaveValue("我的学习率实验");
  await context.close();
});
test("invalid payload is recoverable and mobile page fits", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/view#v1.broken");
  await expect(
    page.getByRole("heading", { name: "这份作品暂时打不开" }),
  ).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("link", { name: /在网页使用玩乎/ })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});
