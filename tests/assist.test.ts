import {describe,it,expect} from 'vitest';
import {AssistInputSchema,AssistResultSchema,assistPrompt} from '../src/lib/assist';
describe('bounded paragraph assistance',()=>{
  const input={mode:'teach' as const,material:'一个论证段落',question:'缺了哪一步？',history:[],consent:true as const};
  it('requires material, explicit consent and bounded history',()=>{
    expect(AssistInputSchema.safeParse(input).success).toBe(true);
    for(const change of [{material:''},{consent:false},{material:'字'.repeat(20001)},{history:Array(5).fill({question:'问',answer:'答'})}])expect(AssistInputSchema.safeParse({...input,...change}).success).toBe(false);
  });
  it('separates author and reader instructions and retains recent questions',()=>{
    expect(assistPrompt(input)).toContain('当前是作者');
    expect(assistPrompt({...input,mode:'learn',history:[{question:'之前的问题',answer:'之前的回答'}]})).toContain('当前是读者');
    expect(assistPrompt({...input,history:[{question:'之前的问题',answer:'之前的回答'}]})).toContain('之前的问题');
    expect(assistPrompt(input)).toContain('不生成作品');
  });
  it('rejects empty and oversized answers',()=>{
    expect(AssistResultSchema.safeParse({answer:''}).success).toBe(false);
    expect(AssistResultSchema.safeParse({answer:'字'.repeat(6001)}).success).toBe(false);
  });
});
