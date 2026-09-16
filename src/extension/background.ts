import { ExtensionMessageSchema,SavedDemoSchema,pageIdentity,isZhihuPage } from './protocol';
import { LessonSchema } from '../lib/lesson';
import { readApiResponse } from '../lib/api-response';
import { decodeLesson } from '../lib/share';

const pageQueues=new Map<string,Promise<unknown>>();
function withPageQueue<T>(key:string,action:()=>Promise<T>):Promise<T> {
  const next=(pageQueues.get(key)??Promise.resolve()).catch(()=>undefined).then(action);
  pageQueues.set(key,next);
  void next.finally(()=>{if(pageQueues.get(key)===next)pageQueues.delete(key);}).catch(()=>undefined);
  return next;
}

async function backend(path:'/api/capabilities'|'/api/generate'|'/api/assist',body?:unknown) {
  const deadline=Date.now()+50000;
  const response=await fetch(__BACKEND_URL__+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,credentials:'omit',redirect:'error',signal:AbortSignal.timeout(50000)});
  return readApiResponse(response,deadline);
}
chrome.runtime.onMessage.addListener((raw,sender,reply)=>{
  if(sender.id!==chrome.runtime.id||sender.frameId!==0||!sender.tab?.id||!sender.url||!isZhihuPage(sender.url))return;
  const parsed=ExtensionMessageSchema.safeParse(raw);
  if(!parsed.success){reply({ok:false,error:'请求内容无效，请重新选择材料'});return;}
  const message=parsed.data;
  void (async()=>{
    // sender.url is the document's initial URL and can lag behind history.replaceState in Zhihu's editor.
    const tab=await chrome.tabs.get(sender.tab!.id!);
    if(!tab.url||!isZhihuPage(tab.url))throw new Error('请回到知乎页面后重试');
    const currentPage=pageIdentity(tab.url);
    if(message.type==='status')return backend('/api/capabilities');
    if(message.type==='assist') {
      if(pageIdentity(message.pageUrl)!==currentPage)throw new Error('页面已经变化，请重新选取材料');
      return backend('/api/assist',message.input);
    }
    if(message.type==='generate') {
      if(pageIdentity(message.context.pageUrl)!==currentPage)throw new Error('页面已经变化，请重新选取材料');
      if(!message.context.text.trim())throw new Error('请先选取正文');
      const source={...message.context.source,excerpt:message.context.text.slice(0,1200)};
      const result=await backend('/api/generate',{mode:message.context.mode,material:message.context.text,question:message.question,sources:[source],sourceMaterials:[{sourceId:source.id,text:message.context.text}],standardModel:true});
      if(result.unsupported)throw new Error(result.reason||'请补充具体段落后再生成');
      return {lesson:LessonSchema.parse(result.lesson)};
    }
    if(message.type==='open-workshop') {
      await decodeLesson(message.payload);
      const mode=message.mode==='teach'?'teach':'learn';
      await chrome.tabs.create({url:__BACKEND_URL__+'/create?mode='+mode+'#'+message.payload});return {};
    }
    const target=message.type==='load'?message.pageUrl:message.demo.pageUrl;
    if(pageIdentity(target)!==currentPage)throw new Error('只能操作当前知乎页面的演示');
    const key='wanhu.demos.'+currentPage;
    return withPageQueue(key,async()=>{
    const stored=await chrome.storage.local.get(key);
    const demos=SavedDemoSchema.array().max(12).safeParse(stored[key]??[]);
    if(!demos.success)throw new Error('当前页面的演示记录无法读取，原数据仍保留');
    if(message.type==='load')return demos.data;
    if(demos.data.length>=12&&!demos.data.some(item=>item.id===message.demo.id))throw new Error('本页已有 12 份演示，请先通过分享链接保留作品');
    await chrome.storage.local.set({[key]:[message.demo,...demos.data.filter(item=>item.id!==message.demo.id)]});return {};
    });
  })().then(data=>reply({ok:true,data})).catch(error=>reply({ok:false,error:error instanceof Error?error.message:'服务暂不可用，请保留输入后重试'}));
  return true;
});
chrome.action.onClicked.addListener(tab=>{
  if(tab.id&&tab.url&&isZhihuPage(tab.url))void chrome.tabs.sendMessage(tab.id,{type:'wanhu-toggle'}).catch(()=>undefined);
  else void chrome.tabs.create({url:__BACKEND_URL__+'/create'});
});
