import {test,expect} from '@playwright/test';
import {showcase} from '../src/lib/showcase';
import {encodeLesson} from '../src/lib/share';

test('an earlier first animation timestamp cannot crash SVG playback',async({page},testInfo)=>{
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  // A RAF callback can receive the frame start timestamp, earlier than the
  // performance.now() sampled by the event handler that starts playback.
  await page.addInitScript(()=>{
    const raf=window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame=callback=>raf(timestamp=>callback(timestamp-100));
  });
  await page.goto('/view#'+await encodeLesson({...showcase[0].lesson,title:'时钟边界回归演示'}));
  const scene=page.getByLabel('SVG 分镜演示',{exact:true});
  await scene.getByRole('button',{name:'播放演示',exact:true}).click();
  await expect(scene.getByRole('button',{name:'暂停',exact:true})).toBeVisible();
  await expect(scene.locator('.scene-caption')).toContainText('SYN 到达服务端',{timeout:7000});
  await scene.getByRole('button',{name:'暂停',exact:true}).click();
  expect(errors).toEqual([]);
  await page.screenshot({path:testInfo.outputPath('animation-after.png')});
});
