import { test, expect } from "@playwright/test";

test("leaving before the autosave delay still persists the latest valid edit", async ({
  page,
}) => {
  await page.goto("/create?example=gradient-descent");
  await expect(page.getByLabel("作品标题")).toBeVisible();
  await page.clock.install();
  await page.clock.pauseAt(Date.now() + 1000);
  await page.getByLabel("作品标题").fill("离开前刚刚改好的标题");
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  const saved = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem(
        `wanhu.work.v1.${new URL(location.href).searchParams.get("work")}`,
      ) ?? "null",
    ),
  );
  expect(saved?.lesson.title).toBe("离开前刚刚改好的标题");
});

test("client navigation flushes the pending draft before the editor unmounts", async ({
  page,
}) => {
  await page.goto("/create?example=gradient-descent");
  await expect(page.getByLabel("作品标题")).toBeVisible();
  await page.clock.install();
  await page.clock.pauseAt(Date.now() + 1000);
  await page.getByLabel("作品标题").fill("返回首页也不能丢的修改");
  const workId = new URL(page.url()).searchParams.get("work");
  await page
    .getByRole("link", { name: "玩乎首页", exact: true })
    .click({ force: true });
  await expect(
    page.getByRole("heading", { name: "让知识， 动起来。" }),
  ).toBeVisible();
  const saved = await page.evaluate(
    (id) => JSON.parse(localStorage.getItem(`wanhu.work.v1.${id}`) ?? "null"),
    workId,
  );
  expect(saved?.lesson.title).toBe("返回首页也不能丢的修改");
});
