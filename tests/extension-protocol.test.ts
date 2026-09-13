import {describe,it,expect} from 'vitest';
import {ExtensionMessageSchema,PageContextSchema,SavedDemoSchema,isZhihuPage,pageIdentity} from '../src/extension/protocol';
import {articleLesson} from './article-fixture';
describe('extension boundaries',()=>{
  it('accepts only actual HTTPS Zhihu hosts, not lookalikes, credentials or ports',()=>{
    expect(isZhihuPage('https://www.zhihu.com/question/1/answer/2')).toBe(true);
    for(const value of ['https://www.zhihu.com.evil.com/p/1','http://www.zhihu.com/p/1','https://user@www.zhihu.com/p/1','https://www.zhihu.com:444/p/1','javascript:alert(1)','https://api.zhihu.com/p/1'])expect(isZhihuPage(value)).toBe(false);
    expect(pageIdentity('https://zhihu.com/question/1/answer/2?utm_source=x#comment')).toBe('https://www.zhihu.com/question/1/answer/2');
  });
  it('requires consent and rejects hidden proxy fields and foreign source URLs',()=>{
    const context={pageUrl:'https://zhuanlan.zhihu.com/p/123',source:{...articleLesson.sources[0],url:'https://zhuanlan.zhihu.com/p/123'},text:'实际选取的文字',mode:'learn',selection:true};
    expect(PageContextSchema.safeParse(context).success).toBe(true);
    expect(ExtensionMessageSchema.safeParse({type:'generate',context,question:'为什么',consent:false}).success).toBe(false);
    expect(ExtensionMessageSchema.safeParse({type:'generate',context,question:'为什么',consent:true,url:'https://evil.com'}).success).toBe(false);
    expect(PageContextSchema.safeParse({...context,source:articleLesson.sources[0]}).success).toBe(false);
    expect(PageContextSchema.safeParse({...context,text:'字'.repeat(20001)}).success).toBe(false);
  });
  it('validates persisted lessons and workshop payloads',()=>{
    expect(SavedDemoSchema.safeParse({id:crypto.randomUUID(),pageUrl:'https://zhuanlan.zhihu.com/p/1',createdAt:new Date().toISOString(),lesson:articleLesson}).success).toBe(true);
    expect(ExtensionMessageSchema.safeParse({type:'open-workshop',payload:'https://evil.com'}).success).toBe(false);
    expect(ExtensionMessageSchema.safeParse({type:'open-workshop',payload:'v1.'+'a'.repeat(12001)}).success).toBe(false);
  });
});
