import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const out=path.resolve('.artifacts/extension-live-'+Date.now());await mkdir(out,{recursive:true});
const extension=path.resolve('dist/extension');
const context=await chromium.launchPersistentContext(path.join(out,'profile'),{channel:'chromium',executablePath:process.env.EXTENSION_CHROMIUM_PATH||path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1234/chrome-win64/chrome.exe'),headless:true,viewport:{width:1440,height:1000},args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
const results=[];
try {
  for(const url of ['https://www.zhihu.com/question/19734686/answer/2508126669','https://www.zhihu.com/tardis/bd/ans/2508126669']){
    const page=await context.newPage();
    try {
      const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000});
      if(response?.ok())await page.getByRole('button',{name:'打开玩乎',exact:true}).waitFor({timeout:8000});
      const result={url:page.url(),status:response?.status(),title:await page.title(),launcher:await page.locator('[data-wanhu-host="workspace"]').count(),bodyCount:await page.locator('.RichText,.Post-RichText').count(),snippet:(await page.locator('body').innerText()).slice(0,200)};
      results.push(result);await page.screenshot({path:path.join(out,'page-'+results.length+'.png')});
    }catch(error){results.push({url,error:error.message});}
    await page.close();
  }
}finally{await writeFile(path.join(out,'result.json'),JSON.stringify(results,null,2));await context.close();}
console.log(JSON.stringify({out,results},null,2));
