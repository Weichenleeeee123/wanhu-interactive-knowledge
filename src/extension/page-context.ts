import { isZhihuPage,pageIdentity,type PageContext } from './protocol';

const BODY='.RichContent-inner .RichText, .Post-RichText, .Post-RichTextContainer, .AnswerItem .RichText, article .RichText';
const EDITOR='[contenteditable="true"]';
export function pageMode():PageContext['mode'] {
  return /\/write(?:\/|$)|\/edit(?:\/|$)/.test(location.pathname) || Array.from(document.querySelectorAll(EDITOR)).some(item=>item.getClientRects().length>0&&item.closest('.WriteIndex, .AnswerForm, .PostEditor')) ? 'teach':'learn';
}
export function sourceUrlFor(element:Element|null):string {
  const container=element?.closest('.AnswerItem, article, .Post-Main');
  const links=Array.from(container?.querySelectorAll('a[href*="/answer/"]')??[]).filter(link=>!link.closest('.RichText, .Post-RichText, [contenteditable]'));
  const href=links[0]?.getAttribute('href');
  if(href){const absolute=new URL(href,location.href).href;if(isZhihuPage(absolute))return pageIdentity(absolute);}
  return pageIdentity(location.href);
}
export function outsideEditor(element:Element):Element {
  let result=element;
  for(let parent:Element|null=element;parent;parent=parent.parentElement){
    if(parent.matches('[contenteditable="true"], .DraftEditor-root, .Editable'))result=parent;
  }
  return result;
}
export function findAnchor(text:string,sourceUrl?:string):Element|null {
  const candidates=Array.from(new Set(Array.from(document.querySelectorAll(BODY)).flatMap(body=>Array.from(body.querySelectorAll('p,blockquote,li,h2,h3')))))
    .filter(item=>item instanceof HTMLElement&&item.innerText.trim()===text.trim()&&(!sourceUrl||sourceUrlFor(item)===sourceUrl));
  return candidates.length===1?candidates[0]:null;
}
export function contextFromPage(preferSelection=true):{context:PageContext;anchor:Element|null} {
  if(!isZhihuPage(location.href))throw new Error('请打开知乎页面');
  const selection=window.getSelection();
  let selected=preferSelection?selection?.toString().trim()??'':'';
  let anchor=selected&&selection?.rangeCount?selection.getRangeAt(0).endContainer:null;
  let element=anchor instanceof Element?anchor:anchor?.parentElement??null;
  if(element?.getRootNode() instanceof ShadowRoot)throw new Error('请在知乎正文中选取材料');
  if(element?.closest('[data-wanhu-host]')){element=null;selected='';}
  const editor=element?.closest(EDITOR)??(!selected?Array.from(document.querySelectorAll(EDITOR)).find(item=>item.getClientRects().length>0&&(item.closest('.WriteIndex, .AnswerForm, .PostEditor')||/\/write(?:\/|$)|\/edit(?:\/|$)/.test(location.pathname)))??null:null);
  let body:Element|null=element?.closest(BODY)??null;
  if(!selected&&!editor){
    const candidates=Array.from(document.querySelectorAll(BODY)).filter(item=>item.getClientRects().length>0&&!item.querySelector(BODY));
    body=candidates.length===1?candidates[0]:null;
    if(!body)throw new Error('请先在要理解的那篇回答里选中一段文字，再打开玩乎');
  }
  const container=element?.closest('.AnswerItem, article, .Post-Main')??body?.closest('.AnswerItem, article, .Post-Main');
  const mode=editor?'teach':'learn';
  if(selected&&!editor&&!body)throw new Error('请在文章正文或写作编辑器中选取文字');
  if(selected&&selection?.rangeCount){
    const start=selection.getRangeAt(0).startContainer;
    const startElement=start instanceof Element?start:start.parentElement;
    if((startElement?.closest(EDITOR)??startElement?.closest(BODY))!==(editor??body))throw new Error('请一次只选择同一篇文章或回答中的段落');
  }
  if(!selected&&body?.closest('.RichContent.is-collapsed'))throw new Error('请先展开回答，或选取已显示的一段文字');
  const content=editor??body;
  const text=selected || (content instanceof HTMLElement?content.innerText:'').trim();
  if(!text)throw new Error('还没有可用正文，请先选中一段文章或写作内容');
  if(text.length>20000)throw new Error('这段内容超过 20,000 字符，请选取更短的段落');
  const heading=document.querySelector('.Post-Title, .QuestionHeader-title, h1');
  const titleInput=document.querySelector('textarea[placeholder*="标题"], input[placeholder*="标题"]');
  const title=(titleInput instanceof HTMLInputElement||titleInput instanceof HTMLTextAreaElement?titleInput.value:heading?.textContent)||document.title.replace(/\s*[-–]\s*知乎.*$/,'');
  const author=(container?container.querySelector('.AuthorInfo-name, .Post-Author .UserLink-link'):document.querySelector('.Post-Author .UserLink-link'))?.textContent?.trim()??'';
  const sourceUrl=sourceUrlFor(element??body??editor);
  const id='page-'+sourceUrl.replace(/^https:\/\//,'').replace(/[^a-zA-Z0-9]/g,'-').slice(0,85);
  const safeAnchor=editor?outsideEditor(editor):element?.closest('p,blockquote,li,h2,h3')??body;
  return {context:{pageUrl:pageIdentity(location.href),source:{id,title:title.trim().slice(0,200)||'知乎页面材料',author:author.slice(0,80),url:sourceUrl,excerpt:text.slice(0,1200),provenance:'user'},text,mode,selection:!!selected},anchor:safeAnchor};
}
