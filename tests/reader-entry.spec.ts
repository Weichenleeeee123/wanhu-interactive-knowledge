import { test, expect } from "@playwright/test";
import { getExample } from "../src/lib/examples";
import { encodeLesson } from '../src/lib/share';

test("a learner opens the generated snapshot directly and edited links cannot remain stale",async({page})=>{
  await page.route("**/api/capabilities",route=>route.fulfill({json:{search:true,generation:true,provider:"zhihu"}}));
  await page.route("**/api/generate",route=>route.fulfill({json:{lesson:{...getExample("monty-hall"),origin:"ai",title:"我自己的三门讲解"},reason:""}}));
  await page.goto("/create?mode=learn&topic=monty-hall");
  await page.getByRole("checkbox").check();
  await page.getByRole("button",{name:"生成我的互动阅读 ↗",exact:true}).click();
  const read=page.getByRole("link",{name:"开始阅读 ↗",exact:true});
  await expect(read).toBeVisible();
  const first=await read.getAttribute("href");
  await expect(page.getByLabel('作品标题')).toHaveCount(0);
  await page.getByRole('button',{name:'我想讲清楚',exact:true}).click();
  const authorRead=page.getByRole('link',{name:'用读者视角打开 ↗',exact:true});
  await page.getByLabel("作品标题").fill("");
  await expect(authorRead).toHaveCount(0);
  await page.getByLabel("作品标题").fill("修改后的三门讲解");
  await expect(authorRead).toBeVisible();
  await expect(authorRead).not.toHaveAttribute("href",first!);
  const popupPromise=page.waitForEvent("popup");
  await authorRead.click();
  const reader=await popupPromise;
  await expect(reader.getByRole("heading",{name:"修改后的三门讲解",exact:true})).toBeVisible();
  await expect(reader.getByRole("button",{name:"选择 1 号门",exact:true})).toBeVisible();
});

test('extension hash import respects the reader role across refresh',async({page})=>{
  const payload=await encodeLesson(getExample('monty-hall')!);
  await page.goto('/create?mode=learn#'+payload);
  await expect(page.getByRole('heading',{name:'从不理解的地方，开始探索。'})).toBeVisible();
  await expect(page.getByRole('link',{name:'开始阅读 ↗',exact:true})).toBeVisible();
  await expect(page.getByLabel('作品标题')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading',{name:'从不理解的地方，开始探索。'})).toBeVisible();
});

test('lightweight thinking answers and follows up without generating or replacing a work',async({page})=>{
  const calls:Record<string,unknown>[]=[];
  let generations=0;
  await page.route('**/api/assist',route=>{calls.push(route.request().postDataJSON());return route.fulfill({json:{answer:'先解释任务为什么要拆小，再给出十分钟就能开始的动作。'}});});
  await page.route('**/api/generate',route=>{generations++;return route.fulfill({status:500,json:{error:'不应调用生成'}});});
  await page.goto('/create');
  await page.getByLabel('补充你的讲解材料').fill('把大任务拆成可以在十分钟内开始的小步骤。');
  await page.locator('.thinking-assist summary').click();
  await page.getByRole('button',{name:'检查论证',exact:true}).click();
  await page.getByRole('checkbox',{name:'同意发送本段材料，用于这次对话'}).check();
  await page.getByRole('button',{name:'先回答这个问题',exact:true}).click();
  await expect(page.locator('.assist-conversation')).toContainText('先解释任务');
  expect(calls[0].mode).toBe('teach');
  await page.getByLabel('继续追问',{exact:true}).fill('给我一个具体例子');
  await page.getByRole('button',{name:'发送追问',exact:true}).click();
  await expect(page.locator('.assist-conversation article')).toHaveCount(2);
  expect(calls[1].history).toHaveLength(1);
  expect(generations).toBe(0);
  await page.getByRole('button',{name:'用这个问题制作演示',exact:true}).last().click();
  await expect(page.getByLabel('想讲清楚的问题')).toHaveValue('给我一个具体例子');
  await page.getByLabel('补充你的讲解材料').fill('这是另一段材料。');
  await expect(page.locator('.assist-conversation article')).toHaveCount(0);
  await expect(page.getByRole('checkbox',{name:'同意发送本段材料，用于这次对话'})).not.toBeChecked();
});

test("creator actions remain reachable on a narrow phone",async({page})=>{
  await page.setViewportSize({width:360,height:800});
  await page.goto("/create?example=gradient-descent");
  await expect(page.getByRole("link",{name:"用读者视角打开 ↗",exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
