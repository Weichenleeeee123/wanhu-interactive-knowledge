import { test, expect } from "@playwright/test";
import { examples } from "../src/lib/examples";
async function mockGenerationAvailable(page: import("@playwright/test").Page) {
  await page.route("**/api/capabilities", (route) =>
    route.fulfill({
      json: { search: true, generation: true, provider: "test" },
    }),
  );
}
test("an old generation response cannot replace newer author edits", async ({
  page,
}) => {
  await mockGenerationAvailable(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started!: () => void;
  const began = new Promise<void>((resolve) => {
    started = resolve;
  });
  await page.route("**/api/generate", async (route) => {
    started();
    await pending;
    await route.fulfill({
      json: {
        lesson: { ...examples["gradient-descent"], origin: "ai" },
        reason: "测试延迟结果",
      },
    });
  });
  await page.goto("/create");
  await page.getByLabel("想讲清楚的问题").fill("学习率为什么不能太大？");
  await page
    .getByLabel("补充你的讲解材料")
    .fill("梯度下降按负梯度更新，学习率影响更新幅度。");
  await page.getByRole("checkbox", { name: /生成后由我核对/ }).check();
  await page.getByRole("button", { name: "生成我的互动草稿 ↗" }).click();
  await began;
  const abandoned=page.waitForEvent('requestfailed',request=>request.url().endsWith('/api/generate'));
  await page.getByRole("button", { name: "三门问题 →", exact: true }).click();
  await page.getByLabel("作品标题").fill("请保留我的新编辑");
  release();
  await abandoned;
  await expect(page.getByLabel("作品标题")).toHaveValue("请保留我的新编辑");
});
test("long pasted material is preserved and blocked with an explicit message", async ({
  page,
}) => {
  await mockGenerationAvailable(page);
  await page.goto("/create");
  await page.getByLabel("想讲清楚的问题").fill("学习率");
  const material = "学".repeat(20001);
  await page.getByLabel("补充你的讲解材料").fill(material);
  expect((await page.getByLabel("补充你的讲解材料").inputValue()).length).toBe(
    20001,
  );
  await expect(page.getByText(/材料超过 20,000/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "生成我的互动草稿 ↗" }),
  ).toBeDisabled();
});
test("gradient rate uses the same precision in inputs, question and grading", async ({
  page,
}) => {
  await page.goto("/view?example=gradient-descent");
  await page.getByLabel("学习率数值").fill("0.123456");
  await expect(page.getByLabel("学习率数值")).toHaveValue("0.12");
  await page.getByLabel("你的下一步位置").fill("6.08");
  await page.getByRole("button", { name: "验证答案" }).click();
  await expect(
    page.getByText("回答正确！你已经掌握了单步更新。"),
  ).toBeVisible();
});
