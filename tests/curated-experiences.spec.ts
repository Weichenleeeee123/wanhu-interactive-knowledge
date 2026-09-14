import { test, expect } from "@playwright/test";
import { showcase } from "../src/lib/showcase";
import { encodeLesson } from "../src/lib/share";

test("all ten hand-authored presentations render without model requests and fit a narrow screen", async ({
  page,
}) => {
  const generated: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/generate")) generated.push(request.url());
  });
  for (const item of showcase) {
    await page.goto(`/view?example=showcase-${item.id}`);
    await expect(page.locator(".curated")).toBeVisible();
    await expect(page.locator(".curated-source")).toContainText(
      item.source.author,
    );
    await page.setViewportSize({ width: 390, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.setViewportSize({ width: 1280, height: 900 });
  }
  expect(generated).toEqual([]);
});
test("TCP handshake advances the two endpoint states independently", async ({
  page,
}) => {
  await page.goto("/view?example=showcase-tcp-handshake");
  await page.getByRole("button", { name: "发送 SYN →", exact: true }).click();
  await expect(page.locator(".tcp-endpoints code").first()).toHaveText(
    "SYN-SENT",
  );
  await page
    .getByRole("button", { name: "返回 SYN + ACK ←", exact: true })
    .click();
  await expect(page.locator(".tcp-endpoints code").last()).toHaveText(
    "SYN-RECEIVED",
  );
  await page
    .getByRole("button", { name: "发送最终 ACK →", exact: true })
    .click();
  await expect(page.locator(".tcp-status")).toContainText("连接已建立");
});
test("merge refuses an out-of-order head and accepts consecutive picks from the same lane", async ({
  page,
}) => {
  await page.goto("/view?example=showcase-merge-sort");
  await page.getByRole("button", { name: "取出B队首 2" }).click();
  await expect(page.locator(".curated-insight")).toContainText(
    "另一侧的 1 更小",
  );
  for (const name of [
    "取出A队首 1",
    "取出B队首 2",
    "取出B队首 3",
    "取出A队首 4",
    "取出A队首 7",
    "取出B队首 8",
  ])
    await page.getByRole("button", { name }).click();
  await expect(page.locator(".merge-output .filled")).toHaveText([
    "1",
    "2",
    "3",
    "4",
    "7",
    "8",
  ]);
});
test("coffee compares preparation temperatures instead of scoring an answer", async ({
  page,
}) => {
  await page.goto("/view?example=showcase-coffee-process");
  await page.getByRole("button", { name: "02 低温浸泡" }).click();
  await expect(page.locator(".curated-insight")).toContainText("低温水");
  await page.getByRole("button", { name: "ICED AMERICANO 冰美式" }).click();
  await page.getByRole("button", { name: "03 加水与冰" }).click();
  await expect(page.locator(".curated-insight")).toContainText(
    "不等于用冷水萃取",
  );
});
test("opportunity cost and causal intervention respond to changed conditions", async ({
  page,
}) => {
  await page.goto("/view?example=showcase-opportunity-cost");
  await expect(page.locator(".choice-receipt strong")).toContainText(
    "好好休息",
  );
  await page.getByLabel("和朋友见面的主观价值").fill("10");
  await expect(page.locator(".choice-receipt strong")).toContainText(
    "和朋友见面",
  );
  await page.goto("/view?example=showcase-causal-evidence");
  await page.getByRole("button", { name: "干预：只改变 A" }).click();
  await page.getByLabel("干预销量").fill("20");
  await expect(page.locator(".causal-meters output")).toHaveText(["20", "65"]);
});
test("notes can be retrieved and reading recollection remains private", async ({
  page,
}) => {
  await page.goto("/view?example=showcase-notes-workflow");
  await page.getByLabel("搜索示例笔记").fill("咖啡");
  await expect(page.locator(".note-paper")).toHaveCount(1);
  await page.locator(".note-paper").click();
  await expect(page.locator(".note-context")).toContainText("方法与结果");
  await page.goto("/view?example=showcase-active-reading");
  await page.getByRole("button", { name: "合上材料，试着讲一遍 →" }).click();
  await expect(page.locator(".book-covered")).toBeHidden();
  await page.getByLabel("我的转述").fill("只取其他选择中最有价值的一项");
  await page.getByRole("button", { name: "打开材料，自己对照 →" }).click();
  await expect(page.getByLabel("我的转述")).toHaveValue(
    "只取其他选择中最有价值的一项",
  );
  await expect(page.locator(".recall-check")).toBeVisible();
});
test("plant illustrations move energy and carbon between named structures", async ({
  page,
}) => {
  await page.goto("/view?example=showcase-chloroplast");
  await page.getByRole("button", { name: "03 能量接力" }).click();
  await expect(page.locator(".leaf-energy")).toHaveClass(/travel/);
  await page.goto("/view?example=showcase-c4-transfer");
  await page.getByRole("button", { name: "03 运输" }).click();
  await expect(page.locator(".carbon-cargo")).toHaveAttribute("style", /548px/);
  await page.getByRole("button", { name: "释放 CO₂ →" }).click();
  await expect(page.locator(".carbon-residue")).toBeVisible();
});
test("shared curated lessons preserve their presentation while edited lessons use editable data", async ({
  page,
}) => {
  const lesson = showcase[0].lesson;
  await page.goto("/view#" + (await encodeLesson(lesson)));
  await expect(page.locator(".tcp-lab")).toBeVisible();
  await page.goto(
    "/view#" + (await encodeLesson({ ...lesson, title: "修改后的演示" })),
  );
  await expect(page.getByLabel("SVG 分镜演示", { exact: true })).toBeVisible();
  await expect(page.locator(".tcp-lab")).toHaveCount(0);
});
