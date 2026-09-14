import { chromium } from '@playwright/test';
import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const out=path.resolve('.artifacts/showcase-live-'+Date.now());await mkdir(out,{recursive:true});
const registry=path.join(out,'registry.mjs');await build({entryPoints:['src/lib/showcase.ts'],outfile:registry,bundle:true,platform:'node',format:'esm'});
const {showcase:all}=await import(pathToFileURL(registry).href);
const only=process.argv.find(a=>a.startsWith('--id='))?.slice(5);const showcase=only?all.filter(i=>i.id===only):all;
const extension=path.resolve('dist/extension');
const context=await chromium.launchPersistentContext(path.join(out,'profile'),{channel:'chromium',executablePath:process.env.EXTENSION_CHROMIUM_PATH||path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1234/chrome-win64/chrome.exe'),headless:true,viewport:{width:1440,height:1600},args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
const results=[];
try{
  for(let i=0;i<showcase.length;i+=2){
    await Promise.all(showcase.slice(i,i+2).map(async item=>{
      const page=await context.newPage();
      const url=process.argv.includes('--mobile')?`https://www.zhihu.com/tardis/bd/${item.articleKey.replace(':','/')}`:item.source.url;
      try{const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:18000});
        if(response?.ok())await page.locator('[data-wanhu-host="inline"]').waitFor({state:'attached',timeout:5000}).catch(()=>undefined);
        const result={id:item.id,url:page.url(),status:response?.status(),title:await page.title(),embedded:await page.locator('[data-wanhu-host="inline"]').count(),curated:await page.locator('[data-wanhu-host="inline"] .curated').count(),bodySnippet:(await page.locator('body').innerText()).slice(0,120)};
        results.push(result);if(result.embedded){await page.locator('[data-wanhu-host="inline"]').evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+window.scrollY-220));await page.screenshot({path:path.join(out,item.id+'.png')});}console.log(JSON.stringify(result));
      }catch(e){const result={id:item.id,url:item.source.url,error:e.message};results.push(result);console.log(JSON.stringify(result));}finally{await page.close();}
    }));
  }
}finally{await context.close();await writeFile(path.join(out,'result.json'),JSON.stringify(results,null,2));}
console.log('Results: '+out);
