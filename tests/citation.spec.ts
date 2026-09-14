import { test, expect } from "@playwright/test";
test("reading a citation preserves the shared lesson payload", async ({
  page,
}) => {
  await page.goto("/create?example=gradient-descent");
  await page.getByRole("button", { name: "发布到知乎文章", exact: true }).click();
  const url = await page.getByLabel("发布到知乎文章的分享链接").inputValue();
  await page.goto(url);
  await page
    .locator(".inline-sources")
    .getByText("如何最简单、通俗地理解梯度下降算法？", { exact: false })
    .click();
  await expect(
    page.getByRole("heading", { name: "步子越大，下山越快吗？", exact: true }),
  ).toBeVisible();
  expect(page.url()).toBe(url);
  await expect(page.locator("details.source-item").first()).toHaveAttribute(
    "open",
    "",
  );
});
