import {test,expect,chromium,type BrowserContext,type Page} from '@playwright/test';
import {createServer,type Server} from 'node:http';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {articleLesson,articleText} from '../article-fixture';
import {encodeLesson} from '../../src/lib/share';

let browser:BrowserContext,server:Server;
let requests:Record<string,unknown>[]=[];
let fail=false;
let delay=0;
let assistance:Record<string,unknown>[]=[];
const output=path.resolve('.artifacts/extension-browser-'+Date.now());
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
  execFileSync(process.execPath,['scripts/build-extension.mjs'],{env:{...process.env,WANHU_BACKEND_URL:'http://localhost:3014',EXTENSION_OUT_DIR:'.artifacts/extension-test-build'}});
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
  await new Promise<void>(resolve=>server.listen(3014,'127.0.0.1',resolve));
  browser=await chromium.launchPersistentContext(path.join(output,'profile'),{channel:'chromium',executablePath:process.env.EXTENSION_CHROMIUM_PATH||path.join(process.env.LOCALAPPDATA!,'ms-playwright/chromium-1234/chrome-win64/chrome.exe'),headless:true,viewport:{width:1440,height:1000},args:[`--disable-extensions-except=${path.resolve('.artifacts/extension-test-build')}`,`--load-extension=${path.resolve('.artifacts/extension-test-build')}`]});
});
test.afterAll(async()=>{await browser?.close();await new Promise<void>(resolve=>server?.close(()=>resolve()));});
test.beforeEach(()=>{requests=[];fail=false;delay=0;assistance=[];});

test('reader selects, reviews, generates, embeds, interacts and restores saved cards',async()=>{
  const page=await browser.newPage();await open(page);await select(page);
  await page.getByRole('button',{name:'打开玩乎',exact:true}).click();
  await expect(page.getByLabel('将用于生成的文字')).toHaveValue(articleText.split('\n\n')[0]);
  expect(requests).toHaveLength(0);
  await expect(page.getByRole('button',{name:'生成这段的互动演示 ↗'})).toBeDisabled();
  await page.locator('.zw-consent input').check();await page.getByRole('button',{name:'生成这段的互动演示 ↗'}).click();
  await expect(page.getByRole('region',{name:'生成结果'})).toContainText(articleLesson.title);
  expect(requests).toHaveLength(1);expect(requests[0].material).toBe(articleText.split('\n\n')[0]);
  expect(JSON.stringify(requests[0])).not.toContain('隐藏材料');
  await page.getByRole('button',{name:'插入正文，开始互动 ↓'}).click();
  await expect(page.locator('#p1 + [data-wanhu-host="inline"]')).toBeVisible();
  await page.getByRole('button',{name:'关闭玩乎',exact:true}).click();
  await page.getByRole('button',{name:'A 先列出三个要点'}).click();
  await expect(page.locator('.reading-evidence')).toContainText('把大任务拆成');
  await page.screenshot({path:path.join(output,'reader-inline.png'),fullPage:true});
  await page.reload();await page.getByRole('button',{name:'打开玩乎',exact:true}).click();
  await page.getByRole('button',{name:/本页演示/}).click();
  await page.locator('.zw-saved').first().click();
  await page.getByRole('button',{name:'插入正文，开始互动 ↓'}).click();
  await expect(page.locator('#p1 + [data-wanhu-host="inline"]')).toBeVisible();
  await page.screenshot({path:path.join(output,'reader-panel.png')});
  await page.close();
});
test('creator preview stays outside the editor and sends only the selected text; errors can retry',async()=>{
  const page=await browser.newPage();
  const html=fixture.replace('<article class="AnswerItem">','<article class="AnswerItem WriteIndex">').replace('<div class="RichText">','<div class="DraftEditor-root"><div contenteditable="true" class="RichText">').replace('</article>','</div></article>');
  await open(page,'https://zhuanlan.zhihu.com/write',html);await select(page,'#p1');
  const before=await page.locator('[contenteditable]').innerHTML();
  await page.getByRole('button',{name:'打开玩乎',exact:true}).click();
  await expect(page.getByRole('button',{name:'创作者 · 帮我讲清'})).toHaveAttribute('aria-pressed','true');
  await page.locator('.zw-consent input').check();fail=true;
  await page.getByRole('button',{name:'生成这段的互动演示 ↗'}).click();
  await expect(page.getByRole('alert')).toContainText('上游暂时不可用');
  await expect(page.getByLabel('将用于生成的文字')).toHaveValue(articleText.split('\n\n')[0]);
  fail=false;await page.getByRole('button',{name:'生成这段的互动演示 ↗'}).click();
  await page.getByRole('button',{name:'插入正文，开始互动 ↓'}).click();
  await expect(page.locator('.DraftEditor-root + [data-wanhu-host="inline"]')).toBeVisible();
  expect(await page.locator('[contenteditable]').innerHTML()).toBe(before);
  expect(requests[1].mode).toBe('teach');
  const [workshop]=await Promise.all([browser.waitForEvent('page'),page.getByRole('button',{name:'到工坊修改讲解与演示 ↗'}).click()]);
  await workshop.waitForURL('**/create?mode=teach#v1.*');expect(workshop.url()).toContain('http://localhost:3014/create?mode=teach#v1.');
  await workshop.close();await page.close();
});

test('selection follows the paragraph automatically; generating inserts without another click',async()=>{
  const page=await browser.newPage();await open(page);await select(page);
  await page.getByRole('button',{name:'打开玩乎',exact:true}).click();
  await select(page,'#p2');
  await expect(page.getByLabel('将用于生成的文字')).toHaveValue(articleText.split('\n\n')[1]);
  await page.locator('.zw-consent input').check();
  await page.getByRole('button',{name:'生成这段的互动演示 ↗'}).click();
  await expect(page.locator('#p2 + [data-wanhu-host="inline"]')).toBeVisible();
  await page.getByRole('button',{name:'关闭玩乎',exact:true}).click();
  await page.getByRole('button',{name:'A 先列出三个要点'}).click();
  await page.getByRole('button',{name:'收起',exact:true}).click();
  await page.getByRole('button',{name:'展开',exact:true}).click();
  await expect(page.locator('.reading-evidence')).toBeVisible();
  await page.close();
});

test('empty editor identifies author before selection, and SPA draft URL can generate',async()=>{
  const page=await browser.newPage();
  const html=fixture.replace('<article class="AnswerItem">','<article class="AnswerItem WriteIndex">').replace('<div class="RichText">','<div contenteditable="true" class="RichText">').replace(articleText.split('\n\n')[0],'').replace(articleText.split('\n\n')[1],'');
  await open(page,'https://zhuanlan.zhihu.com/write',html);
  await page.getByRole('button',{name:'打开玩乎',exact:true}).click();
  await expect(page.getByText('作者模式 · 01 / 选取材料')).toBeVisible();
  await page.evaluate(text=>{history.replaceState(null,'','/p/123456/edit');document.querySelector('#p1')!.textContent=text;},articleText.split('\n\n')[0]);
  await page.waitForTimeout(1000);
  await select(page);
  await expect(page.getByLabel('将用于生成的文字')).toHaveValue(articleText.split('\n\n')[0]);
  await page.locator('.zw-consent input').check();
  await page.getByRole('button',{name:'生成这段的互动演示 ↗'}).click();
  await expect(page.getByRole('region',{name:'生成结果'})).toContainText(articleLesson.title);
  expect(requests[0].mode).toBe('teach');
  await page.close();
});
test('ambiguous multi-answer pages and cross-answer selection do not borrow other authors',async()=>{
  const page=await browser.newPage();
  await open(page,'https://www.zhihu.com/question/10',fixture.replace('</main>','<article class="AnswerItem"><div class="AuthorInfo-name">另一作者</div><div class="RichText"><p id="other">另一份回答的内容。</p></div></article></main>'));
  await page.getByRole('button',{name:'打开玩乎',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('先在要理解的那篇回答里选中');
  await page.evaluate(()=>{const range=document.createRange();range.setStart(document.querySelector('#p1')!.firstChild!,0);range.setEnd(document.querySelector('#other')!.firstChild!,3);window.getSelection()!.removeAllRanges();window.getSelection()!.addRange(range);});
  await page.getByRole('button',{name:'重新读取选段 ↻'}).click();
  await expect(page.getByRole('alert')).toContainText('一次只选择同一篇');
  expect(requests).toHaveLength(0);await page.close();
});
test('SPA navigation clears page-specific state and ignores page-script messages',async()=>{
  const page=await browser.newPage();await open(page);await page.getByRole('button',{name:'打开玩乎',exact:true}).click();
  await expect(page.getByLabel('将用于生成的文字')).not.toHaveValue('');
  await page.evaluate(()=>{window.postMessage({type:'generate',context:{text:'恶意页面内容'},consent:true},'*');history.pushState(null,'','/question/555/answer/666');});
  await expect(page.getByLabel('将用于生成的文字')).toHaveCount(0);
  await page.getByRole('button',{name:/本页演示/}).click();
  await expect(page.locator('.zw-saved')).toHaveCount(0);expect(requests).toHaveLength(0);
  await page.close();
});

test('generation keeps its original anchor when the reader selects another paragraph while waiting',async()=>{
  delay=900;
  const page=await browser.newPage();await open(page);await select(page);
  await page.getByRole('button',{name:'打开玩乎',exact:true}).click();
  await page.locator('.zw-consent input').check();
  await page.getByRole('button',{name:'生成这段的互动演示 ↗'}).click();
  await expect.poll(()=>requests.length).toBe(1);
  await select(page,'#p2');
  await expect(page.getByLabel('将用于生成的文字')).toHaveValue(articleText.split('\n\n')[1]);
  await expect(page.locator('#p1 + [data-wanhu-host="inline"]')).toBeVisible();
  await expect(page.locator('#p2 + [data-wanhu-host="inline"]')).toHaveCount(0);
  await page.close();
});

test('an article share is recognized automatically, starts compact and offers direct follow-up',async()=>{
  const payload=await encodeLesson(articleLesson);
  const page=await browser.newPage();
  await open(page,undefined,fixture.replace('</article>',`<p><a href="http://localhost:3014/view#${payload}">试试文中的方法</a></p></article>`));
  const card=page.locator('[data-wanhu-host="inline"]');
  await expect(card).toBeVisible();
  await expect(card.getByText('作者附带的互动演示',{exact:true})).toBeVisible();
  await expect(card.locator('.zw-experience')).toBeHidden();
  await card.getByRole('button',{name:'展开',exact:true}).click();
  await card.getByRole('button',{name:'在侧边栏继续',exact:true}).click();
  await page.locator('.zw-result .thinking-assist summary').click();
  await page.getByRole('button',{name:'解释这段',exact:true}).click();
  await page.getByRole('checkbox',{name:'同意发送本段材料，用于这次对话'}).check();
  await page.getByRole('button',{name:'先回答这个问题',exact:true}).click();
  await expect(page.locator('.assist-conversation')).toContainText('先做一件');
  expect(assistance[0].mode).toBe('learn');expect(requests).toHaveLength(0);
  await page.getByRole('button',{name:'收起正文',exact:true}).click();
  await expect(card.locator('.zw-experience')).toBeHidden();
  await page.close();
});

