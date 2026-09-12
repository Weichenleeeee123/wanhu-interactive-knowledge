import { test, expect } from '@playwright/test';
import { encodeLesson } from '../src/lib/share';
import { getExample } from '../src/lib/examples';

test('a reader locks a prediction and records actual exploration and verification', async ({ page }) => {
  await page.goto('/view?example=monty-hall');
  await page.getByRole('button', {name:'我的预测：换门胜率 1/2',exact:true}).click();
  await expect(page.getByRole('button',{name:'我的预测：换门胜率 2/3',exact:true})).toBeDisabled();
  await expect(page.getByRole('region',{name:'我的探索记录'})).toContainText('换门胜率 1/2');
  await page.getByRole('button',{name:'运行 1000 次',exact:true}).click();
  await page.getByRole('button',{name:'2/3',exact:true}).click();
  const recap=page.getByRole('region',{name:'我的探索记录'});
  await expect(recap).toContainText('1000');
  await expect(recap).toContainText('挑战已通过');
  await page.getByRole('button',{name:'1/2',exact:true}).click();
  await expect(recap).toContainText('再观察一次');
  await expect(recap).not.toContainText('挑战已通过');
});

test('gradient scenarios reset position and offer observable parameter differences', async ({ page }) => {
  await page.goto('/view?example=gradient-descent');
  await page.getByRole('button',{name:'一步到谷底',exact:true}).click();
  await expect(page.getByLabel('学习率数值')).toHaveValue('0.5');
  await page.getByRole('button',{name:'单步前进',exact:true}).click();
  await expect(page.getByText('已接近谷底（|x| < 10⁻⁸），实验暂停。')).toBeVisible();
  await page.getByRole('button',{name:'越走越远',exact:true}).click();
  await expect(page.getByTestId('gradient-step')).toHaveText('0');
  await expect(page.getByLabel('学习率数值')).toHaveValue('1.2');
});

test('predictions follow authored parameters and a new shared lesson resets exploration', async ({page}) => {
  const base = getExample('gradient-descent')!;
  const first = await encodeLesson({...base, experiment:{type:'gradient-descent',initialX:0,learningRate:1.2}});
  const second = await encodeLesson({...base,title:'一个新的实验',experiment:{type:'gradient-descent',initialX:4,learningRate:0.5}});
  await page.goto('/view#'+first);
  await expect(page.getByRole('heading',{name:'按当前初始参数：x = 0，学习率 1.2，你猜会怎样？'})).toBeVisible();
  await page.getByRole('button',{name:'我的预测：会停在谷底',exact:true}).click();
  await page.evaluate(hash=>{window.location.hash=hash;},second);
  await expect(page.getByRole('heading',{name:'一个新的实验',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'按当前初始参数：x = 4，学习率 0.5，你猜会怎样？'})).toBeVisible();
  await expect(page.getByRole('region',{name:'我的探索记录'})).toContainText('在实验前留下一个预测');
  await expect(page.getByRole('button',{name:'我的预测：会靠近谷底',exact:true})).toBeEnabled();
});
