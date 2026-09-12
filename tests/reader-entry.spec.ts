import { test, expect } from "@playwright/test";
import { getExample } from "../src/lib/examples";

test("a learner opens the generated snapshot directly and edited links cannot remain stale",async({page})=>{
  await page.route("**/api/capabilities",route=>route.fulfill({json:{search:true,generation:true,provider:"zhihu"}}));
  await page.route("**/api/generate",route=>route.fulfill({json:{lesson:{...getExample("monty-hall"),origin:"ai",title:"我自己的三门讲解"},reason:""}}));
  await page.goto("/create?mode=learn&topic=monty-hall");
  await page.getByRole("checkbox").check();
  await page.getByRole("button",{name:"把这个问题变成实验 ↗",exact:true}).click();
  const read=page.getByRole("link",{name:"开始阅读 ↗",exact:true});
  await expect(read).toBeVisible();
  const first=await read.getAttribute("href");
  await page.getByLabel("作品标题").fill("");
  await expect(read).toHaveCount(0);
  await page.getByLabel("作品标题").fill("修改后的三门讲解");
  await expect(read).toBeVisible();
  await expect(read).not.toHaveAttribute("href",first!);
  const popupPromise=page.waitForEvent("popup");
  await read.click();
  const reader=await popupPromise;
  await expect(reader.getByRole("heading",{name:"修改后的三门讲解",exact:true})).toBeVisible();
  await expect(reader.getByRole("button",{name:"选择 1 号门",exact:true})).toBeVisible();
});

test("creator actions remain reachable on a narrow phone",async({page})=>{
  await page.setViewportSize({width:360,height:800});
  await page.goto("/create?example=gradient-descent");
  await expect(page.getByRole("link",{name:"用读者视角打开 ↗",exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
