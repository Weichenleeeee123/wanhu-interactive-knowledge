import { z } from 'zod';
import { LessonSchema,SourceSchema } from '../lib/lesson';
import { AssistInputSchema } from '../lib/assist';
export function isZhihuPage(value:string) {
  try {const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&['www.zhihu.com','zhihu.com','zhuanlan.zhihu.com'].includes(url.hostname);}catch{return false;}
}
export function pageIdentity(value:string) {
  if(!isZhihuPage(value))throw new Error('请在知乎文章、回答或写作页面使用玩乎');
  const url=new URL(value);url.search='';url.hash='';url.hostname=url.hostname==='zhihu.com'?'www.zhihu.com':url.hostname;
  return url.toString();
}
// Zhihu wraps outbound article links in its own redirect URL after publishing.
// Decode that one known wrapper without requesting or following arbitrary URLs.
export function articleSharePayload(value:string,backend:string):string|null {
  try {
    let url=new URL(value);
    if(url.origin==='https://link.zhihu.com'&&!url.username&&!url.password&&url.pathname==='/') {
      const target=url.searchParams.get('target');
      if(!target)return null;
      url=new URL(target);
    }
    if(url.origin!==new URL(backend).origin||url.username||url.password||!/^\/view\/?$/.test(url.pathname))return null;
    const payload=url.hash.slice(1);
    return /^v1\.[A-Za-z0-9_-]+$/.test(payload)&&payload.length<=12000?payload:null;
  }catch{return null;}
}
export const PageContextSchema=z.object({
  pageUrl:z.string().max(2048).refine(isZhihuPage),
  source:SourceSchema.refine(source=>isZhihuPage(source.url)),
  text:z.string().max(20000),
  mode:z.enum(['teach','learn']),
  selection:z.boolean(),
}).strict();
export type PageContext=z.infer<typeof PageContextSchema>;
export const SavedDemoSchema=z.object({id:z.string().uuid(),pageUrl:z.string().max(2048).refine(isZhihuPage),lesson:LessonSchema,createdAt:z.string().datetime(),mode:z.enum(['teach','learn']).optional(),origin:z.enum(['personal','article','imported','showcase']).optional(),anchorText:z.string().max(2000).optional(),anchorSourceUrl:z.string().max(2048).refine(isZhihuPage).optional()}).strict();
export type SavedDemo=z.infer<typeof SavedDemoSchema>;
export const ExtensionMessageSchema=z.discriminatedUnion('type',[
  z.object({type:z.literal('status')}).strict(),
  z.object({type:z.literal('assist'),pageUrl:z.string().max(2048).refine(isZhihuPage),input:AssistInputSchema}).strict(),
  z.object({type:z.literal('generate'),context:PageContextSchema,question:z.string().trim().min(1).max(200),consent:z.literal(true)}).strict(),
  z.object({type:z.literal('load'),pageUrl:z.string().max(2048).refine(isZhihuPage)}).strict(),
  z.object({type:z.literal('save'),demo:SavedDemoSchema}).strict(),
  z.object({type:z.literal('open-workshop'),payload:z.string().regex(/^v1\.[A-Za-z0-9_-]+$/).max(12000),mode:z.enum(['teach','learn']).optional()}).strict(),
]);
export async function extensionRequest<T>(message:unknown):Promise<T> {
  const result=await chrome.runtime.sendMessage(message) as {ok?:boolean;data?:T;error?:string};
  if(!result?.ok)throw new Error(result?.error||'扩展暂时无法响应，请刷新知乎页面后重试');
  return result.data as T;
}
