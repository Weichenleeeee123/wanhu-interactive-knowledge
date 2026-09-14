import { test, expect } from "@playwright/test";

test("a reader starts another work without being switched to author mode", async ({page}) => {
  await page.goto("/create?mode=learn");
  await page.getByRole("link",{name:"＋ 新建作品",exact:true}).click();
  await expect(page.getByRole("heading",{name:"从不理解的地方，开始探索。"})).toBeVisible();
  await expect(page.getByLabel("我不理解的地方")).toBeVisible();
  await expect(page.getByRole("button",{name:"发布到知乎文章",exact:true})).toHaveCount(0);
});

test("the mobile landing page exposes real article demos below the two primary entries", async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto("/");
  await page.getByRole("link",{name:/先看看效果 · 10 篇真实知乎文章/}).click();
  await expect(page).toHaveURL(/\/showcase$/);
  await expect(page.getByRole("link",{name:/网页直接体验/})).toHaveCount(10);
});
