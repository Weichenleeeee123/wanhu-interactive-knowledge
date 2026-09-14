import { showcase } from '../src/lib/showcase';
import { encodeLesson } from '../src/lib/share';
import { test, expect } from '@playwright/test';
test('SVG scene plays, scrubs and reveals object explanations',async({page})=>{
  await page.goto('/view#'+await encodeLesson({...showcase.find(e=>e.id==='tcp-handshake')!.lesson,title:'通用结构渲染验收'}));
  const stage=page.getByLabel('SVG 分镜演示', {exact:true}); await expect(stage).toBeVisible();
  await stage.getByRole('button',{name:'查看客户端',exact:true}).click();await expect(stage.locator('.visual-object-detail')).toContainText('客户端');
  await stage.getByRole('button',{name:'下一幕',exact:true}).click();await expect(stage.locator('.scene-caption')).toContainText('SYN 到达服务端');
  await stage.getByLabel('演示进度').fill('1.5');await expect(stage.locator('g[aria-label="查看SYN + ACK"]')).toHaveAttribute('transform','translate(320 230)');
  await stage.getByRole('button',{name:'播放演示',exact:true}).click();await expect(stage.getByRole('button',{name:'暂停',exact:true})).toBeVisible();
  await stage.getByRole('button',{name:'暂停',exact:true}).click();
  await page.setViewportSize({width:390,height:844}); expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('branch choices lead to different outcomes, with backtracking',async({page})=>{
  await page.goto('/view#'+await encodeLesson({...showcase.find(e=>e.id==='coffee-process')!.lesson,title:'通用结构渲染验收'}));const flow=page.getByLabel('分支流程探索',{exact:true});
  await flow.getByRole('button',{name:'走冷萃路径'}).click();await flow.getByRole('button',{name:'继续观察成品'}).click();await expect(flow.locator('.path-current')).toContainText('低温发生在萃取阶段');
  await flow.getByRole('button',{name:'从起点换条路'}).click();await flow.getByRole('button',{name:'走冰美式路径'}).click();await flow.getByRole('button',{name:'加水与冰'}).click();await expect(flow.locator('.path-current')).toContainText('低温发生在成品阶段');
  await flow.getByRole('button',{name:'返回上一步'}).click();await expect(flow.locator('.path-current')).toContainText('热水萃取浓缩');
});
test('review gallery exposes all ten original articles and web experiences',async({page})=>{await page.goto('/showcase');await expect(page.getByRole('link',{name:'在知乎体验 ↗'})).toHaveCount(10);await expect(page.getByRole('link',{name:'网页直接体验 →'})).toHaveCount(10);});
test('numerical demo changes a trajectory while keeping a fixed comparison',async({page})=>{
  await page.goto('/view#'+await encodeLesson({...showcase.find(e=>e.id==='heat-decay')!.lesson,title:'通用结构渲染验收'}));const model=page.getByLabel('可调参数模拟器',{exact:true});
  await model.getByRole('button',{name:'跑到结果',exact:true}).click();await expect(model.locator('.model-readout')).toContainText('剩余分数：9.07');
  await model.getByRole('button',{name:'固定当前条件作对照'}).click();await model.getByLabel('衰减系数').fill('0');
  await model.getByRole('button',{name:'跑到结果',exact:true}).click();await expect(model.locator('.model-readout')).toContainText('剩余分数：100');await expect(model.locator('.model-readout')).toContainText('对照：9.07');
});
