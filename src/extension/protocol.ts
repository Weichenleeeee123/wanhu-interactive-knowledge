import { z } from 'zod';
import { LessonSchema,SourceSchema } from '../lib/lesson';
export function isZhihuPage(value:string) {
  try {const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&['www.zhihu.com','zhihu.com','zhuanlan.zhihu.com'].includes(url.hostname);}catch{return false;}
}
export function pageIdentity(value:string) {
  if(!isZhihuPage(value))throw new Error('请在知乎文章、回答或写作页面使用玩乎');
  const url=new URL(value);url.search='';url.hash='';url.hostname=url.hostname==='zhihu.com'?'www.zhihu.com':url.hostname;
  return url.toString();
}
export const PageContextSchema=z.object({
  pageUrl:z.string().max(2048).refine(isZhihuPage),
  source:SourceSchema.refine(source=>isZhihuPage(source.url)),
  text:z.string().max(20000),
  mode:z.enum(['teach','learn']),
  selection:z.boolean(),
}).strict();
export type PageContext=z.infer<typeof PageContextSchema>;
export const SavedDemoSchema=z.object({id:z.string().uuid(),pageUrl:z.string().max(2048).refine(isZhihuPage),lesson:LessonSchema,createdAt:z.string().datetime(),anchorText:z.string().max(2000).optional(),anchorSourceUrl:z.string().max(2048).refine(isZhihuPage).optional()}).strict();
export type SavedDemo=z.infer<typeof SavedDemoSchema>;
export const ExtensionMessageSchema=z.discriminatedUnion('type',[
  z.object({type:z.literal('status')}).strict(),
  z.object({type:z.literal('generate'),context:PageContextSchema,question:z.string().trim().min(1).max(200),consent:z.literal(true)}).strict(),
  z.object({type:z.literal('load'),pageUrl:z.string().max(2048).refine(isZhihuPage)}).strict(),
  z.object({type:z.literal('save'),demo:SavedDemoSchema}).strict(),
  z.object({type:z.literal('open-workshop'),payload:z.string().regex(/^v1\.[A-Za-z0-9_-]+$/).max(12000)}).strict(),
]);
export async function extensionRequest<T>(message:unknown):Promise<T> {
  const result=await chrome.runtime.sendMessage(message) as {ok?:boolean;data?:T;error?:string};
  if(!result?.ok)throw new Error(result?.error||'扩展暂时无法响应，请刷新知乎页面后重试');
  return result.data as T;
}
