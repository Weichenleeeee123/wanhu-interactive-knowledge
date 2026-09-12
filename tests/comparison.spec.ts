import { test, expect } from "@playwright/test";

test("host comparison makes excluded trials and conditional denominators explicit", async ({page})=>{
  await page.goto("/view?example=monty-hall");
  await page.getByText("如果主持人也不知道奖品在哪？",{exact:true}).click();
  await expect(page.getByRole("button",{name:"对照两种主持人，运行 1000 轮",exact:true})).toBeDisabled();
  await page.getByRole("button",{name:"仍然是 2/3",exact:true}).click();
  await page.getByRole("button",{name:"对照两种主持人，运行 1000 轮",exact:true}).click();
  const result=page.getByTestId("host-comparison");
  await expect(result).toContainText("没有被算作换门失败");
  await expect(result).toContainText("对应条件下的理论概率：1/2");
  await expect(page.getByRole("button",{name:"变成 1/2",exact:true})).toBeDisabled();
  await page.getByText("不靠运气：展开六种等可能情况",{exact:true}).click();
  await expect(page.locator(".lab-proof tbody tr")).toHaveCount(6);
  await expect(page.locator(".lab-proof .excluded-sample")).toHaveCount(2);
  await expect(page.getByRole("region",{name:"我的探索记录"})).toContainText("对照主持人规则 1000 轮");
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test("gradient comparison synchronizes exact states without changing the main experiment", async ({page})=>{
  await page.goto("/view?example=gradient-descent");
  await page.getByText("同一起点，四种学习率会走向哪里？",{exact:true}).click();
  await page.getByRole("button",{name:"一起走 10 步",exact:true}).click();
  await expect(page.getByLabel("对照实验步数")).toHaveValue("10");
  const rows=page.locator(".gradient-comparison-table tbody tr");
  await expect(rows.nth(1)).toHaveText(/η = 0.500/);
  await expect(rows.nth(2)).toHaveText(/η = 1864/);
  await expect(page.getByTestId("gradient-step")).toHaveText("0");
  await expect(page.getByRole("region",{name:"我的探索记录"})).toContainText("第 10 步");
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
