import {test,expect} from '@playwright/test';
import {articleLesson,articleText} from './article-fixture';

test('empty mobile workshop starts with materials and keeps secondary tools available',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/create?mode=learn');
  await expect(page.getByRole('button',{name:'知乎登录',exact:true})).toBeVisible();
  await expect(page.locator('.workspace-toolbar')).toBeHidden();
  await expect(page.getByRole('button',{name:'另存副本',exact:true})).toBeHidden();
  await page.locator('.work-more summary').click();
  await expect(page.getByRole('button',{name:'备份素材与作品 ↓'})).toBeVisible();
  await expect(page.getByLabel('导入 JSON 作品')).toHaveCount(1);
  await page.locator('.work-more summary').click();
  await expect(page.getByLabel('要导入的知乎链接')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('stopping generation preserves input and a late response cannot replace a new attempt',async({page})=>{
  await page.route('**/api/capabilities',r=>r.fulfill({json:{generation:true,search:true,provider:'test'}}));
  let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  let calls=0;
  await page.route('**/api/generate',async r=>{
    calls++;const first=calls===1;if(first)await gate;
    await r.fulfill({json:{lesson:{...articleLesson,title:first?'迟到的旧结果':'新的互动结果'}}}).catch(()=>undefined);
  });
  await page.goto('/create?mode=teach');
  await page.getByLabel('补充你的讲解材料').fill(articleText);
  await page.getByLabel('想讲清楚的问题').fill('怎样从一步开始？');
  await page.getByRole('checkbox',{name:/生成后由我核对/}).check();
  await page.getByRole('button',{name:'生成我的互动草稿 ↗'}).click();
  await expect.poll(()=>calls).toBe(1);
  await page.getByRole('button',{name:'停止等待，保留材料'}).click();
  await expect(page.getByLabel('补充你的讲解材料')).toHaveValue(articleText);
  await page.getByRole('button',{name:'生成我的互动草稿 ↗'}).click();
  await expect(page.getByLabel('作品标题')).toHaveValue('新的互动结果');
  release();
  await expect(page.locator('.preview-panel')).toBeFocused();
  await expect(page.getByLabel('作品标题')).toHaveValue('新的互动结果');
});

test('readers can jump to interaction or focus a question without hunting through the lesson',async({page})=>{
  await page.goto('/view?example=monty-hall');
  await page.getByRole('button',{name:'直接动手试试 ↓'}).click();
  await expect(page.locator('[data-wanhu-interaction] button').first()).toBeFocused();
  await page.getByRole('button',{name:'我有个问题',exact:true}).click();
  await expect(page.locator('.thinking-assist')).toHaveAttribute('open','');
  await expect(page.locator('.assist-question textarea')).toBeFocused();
});

test('reader sharing explains sharing understanding instead of publishing an article',async({page})=>{
  await page.goto('/create?mode=learn&example=monty-hall');
  await page.getByRole('button',{name:'分享阅读链接',exact:true}).click();
  await expect(page.getByLabel('分享这份互动阅读的链接')).toHaveValue(/\/view#v1\./);
  await expect(page.getByRole('dialog')).toContainText('朋友无需安装插件');
  await expect(page.getByRole('dialog')).not.toContainText('粘贴到知乎文章');
});

test('the login entry remembers the current work and role',async({page})=>{
  await page.route('**/api/auth/zhihu/start?**',r=>r.fulfill({contentType:'text/html',body:'授权入口测试'}));
  await page.goto('/create?mode=learn');
  await page.getByLabel('我不理解的地方').fill('为什么？');
  await expect(page).toHaveURL(/work=/);
  const before=new URL(page.url());
  await page.getByRole('button',{name:'知乎登录',exact:true}).click();
  await expect(page).toHaveURL(/\/api\/auth\/zhihu\/start\?/);
  expect(new URL(page.url()).searchParams.get('returnTo')).toBe(before.pathname+before.search);
});
