import {test,expect,chromium,type BrowserContext,type Page} from '@playwright/test';
import {createServer,type Server} from 'node:http';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {articleLesson,articleText} from '../article-fixture';
import {encodeLesson} from '../../src/lib/share';
import {showcase} from '../../src/lib/showcase';

let browser:BrowserContext,server:Server;
let requests:Record<string,unknown>[]=[];
let fail=false;
let delay=0;
let assistance:Record<string,unknown>[]=[];
const output=path.resolve('.artifacts/journey-browser-'+Date.now());
const fixture=`<!doctype html><html><head><meta charset="utf-8"><title>如何开始一个大任务 - 知乎</title><style>body{margin:0;background:#f6f6f6;font:17px/1.9 Arial}header.site{background:white;padding:15px 10%;color:#1772f6;font-size:28px}main{max-width:750px;margin:30px 8%;background:white;padding:32px}h1{font-size:28px}.AuthorInfo-name{color:#666}.RichText p{margin:25px 0}button{font:inherit}</style></head><body><header class="site">知乎 <small style="font-size:14px;color:#666">扩展结构测试页 · 非真实文章</small></header><main><h1 class="QuestionHeader-title">如何开始一个大任务</h1><article class="AnswerItem"><div class="AuthorInfo-name">测试作者</div><a href="/question/1/answer/2">回答永久链接</a><div class="RichContent"><div class="RichContent-inner"><div class="RichText"><p id="p1">${articleText.split('\n\n')[0]}</p><p id="p2">${articleText.split('\n\n')[1]}</p><p style="display:none">不应读取的隐藏材料</p></div></div></div></article></main></body></html>`;
async function open(page:Page,url='https://www.zhihu.com/question/1/answer/2',html=fixture){
  await page.route('https://**.zhihu.com/**',route=>route.fulfill({contentType:'text/html',body:html,headers:{'Content-Security-Policy':"script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline'; frame-src 'none'"}}));
  await page.goto(url);
  await expect(page.getByRole('button',{name:'打开玩乎',exact:true})).toBeVisible();
}
async function select(page:Page,selector='#p1'){
  await page.locator(selector).evaluate(element=>{const range=document.createRange();range.selectNodeContents(element);const selection=window.getSelection()!;selection.removeAllRanges();selection.addRange(range);});
}
test.beforeAll(async()=>{
  execFileSync(process.execPath,['scripts/build-extension.mjs'],{env:{...process.env,WANHU_BACKEND_URL:'http://localhost:3015',EXTENSION_OUT_DIR:'.artifacts/journey-test-build'}});
  await mkdir(output,{recursive:true});
  server=createServer(async(req,res)=>{
    res.setHeader('Content-Type','application/json');
    if(req.url==='/api/capabilities'){res.end(JSON.stringify({generation:true,search:true,provider:'fixture'}));return;}
    if(req.url==='/api/assist'){
      let raw='';for await(const chunk of req)raw+=chunk;assistance.push(JSON.parse(raw));
      res.end(JSON.stringify({answer:'先做一件十分钟内能开始的事，不必一次做完。'}));return;
    }
    if(req.url==='/api/generate'){
      let raw='';for await(const chunk of req)raw+=chunk;
      const input=JSON.parse(raw);requests.push(input);
      if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
      if(fail){res.statusCode=502;res.end(JSON.stringify({error:'测试：上游暂时不可用'}));return;}
      const lesson=structuredClone(articleLesson);lesson.sources=input.sources;lesson.sourceIds=[input.sources[0].id];
      if(lesson.experiment.type==='article-exploration')lesson.experiment.cards.forEach(card=>card.evidence.sourceId=input.sources[0].id);
      res.end(JSON.stringify({lesson}));return;
    }
    res.end('{}');
  });
  await new Promise<void>(resolve=>server.listen(3015,'127.0.0.1',resolve));
  browser=await chromium.launchPersistentContext(path.join(output,'profile'),{channel:'chromium',executablePath:process.env.EXTENSION_CHROMIUM_PATH||path.join(process.env.LOCALAPPDATA!,'ms-playwright/chromium-1234/chrome-win64/chrome.exe'),headless:true,viewport:{width:1440,height:1000},args:[`--disable-extensions-except=${path.resolve('.artifacts/journey-test-build')}`,`--load-extension=${path.resolve('.artifacts/journey-test-build')}`]});
});
test.afterAll(async()=>{await browser?.close();await new Promise<void>(resolve=>server?.close(()=>resolve()));});
test.beforeEach(()=>{requests=[];fail=false;delay=0;assistance=[];});

test('moving focus to the sidebar during selection debounce preserves the chosen paragraph',async()=>{
  const page=await browser.newPage();await open(page);
  await page.getByRole('button',{name:'打开玩乎',exact:true}).click();
  await select(page,'#p2');
  await page.waitForTimeout(40);
  await page.evaluate(()=>window.getSelection()!.removeAllRanges());
  await expect(page.getByLabel('将用于生成的文字')).toHaveValue(articleText.split('\n\n')[1]);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.close();
});

for(const mode of ['learn','teach'] as const)test(`${mode}: editing and selecting the sidebar question preserves article material`,async()=>{
  const page=await browser.newPage();
  const html=mode==='teach'?fixture.replace('<div class="RichText">','<div contenteditable="true" class="RichText">'):fixture;
  await open(page,mode==='teach'?'https://zhuanlan.zhihu.com/p/123456/edit':'https://www.zhihu.com/question/41/answer/42',html);
  await page.getByRole('button',{name:'打开玩乎',exact:true}).click();
  await select(page,'#p2');
  const material=page.getByLabel('将用于生成的文字');
  await expect(material).toHaveValue(articleText.split('\n\n')[1]);
  const question=page.locator('#zw-question');
  await question.fill('请用逐步动画说明这段文字');
  await question.selectText();
  await page.waitForTimeout(250);
  await expect(material).toHaveValue(articleText.split('\n\n')[1]);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.locator('.zw-consent input').check();
  await page.getByRole('button',{name:'生成这段的互动演示 ↗'}).click();
  await expect(page.getByRole('region',{name:'生成结果'})).toBeVisible();
  expect(requests[0].mode).toBe(mode);
  await expect(page.locator('[data-wanhu-host="inline"]')).toHaveCount(1);
  await page.close();
});

test('published Zhihu redirect links embed without moving the reader and appear in the sidebar',async()=>{
  const payload=await encodeLesson(articleLesson);
  const wrapped='https://link.zhihu.com/?target='+encodeURIComponent('http://localhost:3015/view#'+payload);
  const page=await browser.newPage();
  await open(page,undefined,fixture.replace('</div></div></div></article>',`<div style="height:1800px"></div><p><a href="${wrapped}">文章附带演示</a></p></div></div></div></article>`));
  const card=page.getByRole('region',{name:'玩乎正文演示',exact:true});
  await expect(card).toHaveCount(1);
  expect(await page.evaluate(()=>scrollY)).toBe(0);
  await page.getByRole('button',{name:'打开玩乎',exact:true}).click();
  await expect(page.getByRole('button',{name:'本页演示 1',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'本页演示 1',exact:true}).click();
  await expect(page.locator('.zw-saved')).toHaveCount(1);
  await page.locator('.zw-saved').click();
  const [reader]=await Promise.all([browser.waitForEvent('page'),page.getByRole('button',{name:'到网页继续理解 ↗'}).click()]);
  await reader.waitForURL('**/create?mode=learn#v1.*');
  expect(requests).toHaveLength(0);
  await page.screenshot({path:path.join(output,'wrapped-share-sidebar.png')});
  await reader.close();await page.close();
});

test('curated article demos are discoverable in the sidebar before opening the card',async()=>{
  const item=showcase[0],page=await browser.newPage();
  await open(page,item.source.url,fixture.replace(articleText.split('\n\n')[0],item.source.excerpt));
  await expect(page.locator('[data-wanhu-host="inline"] .curated')).toBeVisible();
  await page.getByRole('button',{name:'打开玩乎',exact:true}).click();
  await page.getByRole('button',{name:'本页演示 1',exact:true}).click();
  await expect(page.locator('.zw-saved')).toContainText('预制示例');
  await page.screenshot({path:path.join(output,'curated-sidebar.png')});
  await page.close();
});

test('latest extension embeds the demo in the actual public Zhihu article',async()=>{
  const page=await browser.newPage();
  await page.goto(showcase[0].source.url,{waitUntil:'domcontentloaded'});
  const card=page.getByRole('region',{name:'玩乎正文演示',exact:true});
  await expect(card.locator('.curated')).toBeVisible({timeout:25000});
  await card.getByRole('button',{name:'发送 SYN →',exact:true}).click();
  await expect(card.getByRole('button',{name:'返回 SYN + ACK ←',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'打开玩乎',exact:true}).click();
  await page.getByRole('button',{name:'本页演示 1',exact:true}).click();
  await expect(page.locator('.zw-saved')).toContainText('预制示例');
  await expect(page.locator('.zw-footer')).toContainText('0.4.2');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.screenshot({path:path.join(output,'real-zhihu-latest.png')});
  await page.close();
});

