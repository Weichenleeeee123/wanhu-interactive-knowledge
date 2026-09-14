import { createRoot } from 'react-dom/client';
import { useEffect, useRef, useState } from 'react';
import { ThinkingAssist } from '../components/ThinkingAssist';
import { type AssistInput } from '../lib/assist';
import { InlineExperience } from './InlineExperience';
import { type Lesson, experimentNames } from '../lib/lesson';
import { decodeLesson, encodeLesson } from '../lib/share';
import { contextFromPage, findAnchor, outsideEditor, pageMode } from './page-context';
import { articleSharePayload, extensionRequest, pageIdentity, type PageContext, type SavedDemo } from './protocol';
import { showcaseForUrl } from '../lib/showcase';

const host=document.createElement('div');
host.setAttribute('data-wanhu-host','workspace');
document.documentElement.append(host);
const shadow=host.attachShadow({mode:'open'});
const style=document.createElement('style');style.textContent=__EXTENSION_CSS__;shadow.append(style);
const mount=document.createElement('div');shadow.append(mount);

function demoLabel(demo:SavedDemo) {
  if(demo.origin==='showcase')return '玩乎为本文制作的演示 · 预制示例';
  if(demo.origin==='article')return '作者附带的互动演示';
  if(demo.origin==='personal')return demo.mode==='teach'?'我的演示 · 本页预览':'我生成的互动解释';
  return demo.origin==='imported'?'从分享链接导入的演示':'已保存的互动演示';
}

function InlineDemo({demo,onHide}:{demo:SavedDemo;onHide:()=>void}) {
  const [collapsed,setCollapsed]=useState(demo.origin==='article');
  const openSidebar=()=>window.dispatchEvent(new CustomEvent('wanhu-open-sidebar',{detail:{demo}}));
  return <section className="zw-inline" aria-label="玩乎正文演示">
    <header className="zw-inline-head"><span className="zw-monogram"><img src={__BRAND_ICON__} alt="玩乎" width={42} height={42}/></span><div><strong>{demoLabel(demo)}</strong><small>玩乎 · 原文旁边直接试一试</small></div><button onClick={()=>setCollapsed(!collapsed)} aria-expanded={!collapsed}>{collapsed?'展开':'收起'}</button><button className="zw-inline-later" onClick={openSidebar}>在侧边栏继续</button><button aria-label="移出页面" onClick={onHide}>×</button></header>
    <div hidden={collapsed}><InlineExperience lesson={demo.lesson}/></div>
  </section>;
}
const inlineRoots=new Map<string,{host:HTMLElement;demo:SavedDemo;dispose:()=>void}>();
function collapseAllInline(){inlineRoots.forEach(item=>item.host.shadowRoot?.querySelector<HTMLButtonElement>('button[aria-expanded=true]')?.click());}
function insertDemo(demo:SavedDemo,anchor:Element|null,scroll=true) {
  if(pageIdentity(location.href)!==pageIdentity(demo.pageUrl))throw new Error('页面已经变化，请回到原文章后打开演示');
  const existing=inlineRoots.get(demo.id);
  if(existing?.host.isConnected){existing.host.scrollIntoView({block:'start',behavior:'smooth'});return;}
  if(!anchor?.isConnected)anchor=demo.anchorText?findAnchor(demo.anchorText,demo.anchorSourceUrl):null;
  if(!anchor)throw new Error('未找到原来的段落，请先在正文选段，再点击插入');
  anchor=outsideEditor(anchor);
  const card=document.createElement('div');card.setAttribute('data-wanhu-host','inline');
  const root=card.attachShadow({mode:'open'});
  const sheet=document.createElement('style');sheet.textContent=__EXTENSION_CSS__;root.append(sheet);
  const node=document.createElement('div');root.append(node);
  const reactRoot=createRoot(node);
  const dispose=()=>{reactRoot.unmount();card.remove();inlineRoots.delete(demo.id);};
  inlineRoots.set(demo.id,{host:card,demo,dispose});
  anchor.after(card);
  reactRoot.render(<InlineDemo demo={demo} onHide={()=>{if(demo.origin==='showcase')dismissedShowcases.add(pageIdentity(demo.pageUrl));dispose();}}/>);
  if(scroll)card.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}
const mountedShowcases = new Map<string,string>();
const dismissedShowcases = new Set<string>();
function hydrateShowcase() {
  if(pageMode()==='teach')return;
  const item=showcaseForUrl(location.href);if(!item)return;
  const key=pageIdentity(location.href);
  if(dismissedShowcases.has(key))return;
  const existingId=mountedShowcases.get(key);
  if(existingId&&inlineRoots.get(existingId)?.host.isConnected)return;
  const candidates=Array.from(document.querySelectorAll<HTMLElement>('.Post-RichText,.RichContent-inner .RichText,article .RichText')).filter(b=>b.getClientRects().length&&!b.closest('[contenteditable=true]'));
  const bodies=candidates.filter(b=>!candidates.some(other=>other!==b&&b.contains(other)));
  const paragraphs=bodies.flatMap(b=>Array.from(b.querySelectorAll<HTMLElement>('p,li,blockquote'))).filter(p=>p.getClientRects().length&&p.innerText.trim().length>10);
  const matching=paragraphs.find(p=>p.innerText.includes(item.source.excerpt));
  // On a permalink, use the single loaded article body if the excerpt is farther below.
  const anchor=matching ?? (bodies.length===1 ? paragraphs[0] : null);
  if(!anchor)return;
  const demo:SavedDemo={id:crypto.randomUUID(),pageUrl:key,lesson:item.lesson,createdAt:new Date().toISOString(),origin:'showcase',mode:'learn',anchorText:anchor.innerText.slice(0,2000),anchorSourceUrl:key};
  mountedShowcases.set(key,demo.id);
  // Keep the injected div outside lists: a list's direct children must remain li elements.
  insertDemo(demo,anchor.closest('ul,ol')??anchor,false);

}
async function requestAssistance(input:AssistInput){return extensionRequest<{answer:string}>({type:'assist',pageUrl:pageIdentity(location.href),input});}
function errorText(error:unknown){return error instanceof Error?error.message:'暂时无法完成，请重试';}
async function hydrateArticleEmbeds() {
  hydrateShowcase();
  for (const link of Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))) {
    if (link.closest('[data-wanhu-host], [contenteditable=true]') || link.dataset.wanhuHydrated) continue;
    if (!link.closest('.RichText, .Post-RichText, article')) continue;
    const payload=articleSharePayload(link.href,__BACKEND_URL__);
    if(!payload)continue;
    link.dataset.wanhuHydrated = 'pending';
    try {
      const lesson = await decodeLesson(payload);
      const demo: SavedDemo = { origin: 'article', mode: 'learn', id: crypto.randomUUID(), pageUrl: pageIdentity(location.href), lesson, createdAt: new Date().toISOString(), anchorText: link.innerText.trim().slice(0, 2000), anchorSourceUrl: pageIdentity(location.href) };
      insertDemo(demo, link.closest('ul,ol,p,blockquote')??link, false); link.dataset.wanhuHydrated = 'done';
    } catch { delete link.dataset.wanhuHydrated; }
  }
}

function App() {
  const [open,setOpen]=useState(false),[context,setContext]=useState<PageContext|null>(null);
  const [detectedMode,setDetectedMode]=useState(pageMode);
  const [question,setQuestion]=useState(''),[consent,setConsent]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [demos,setDemos]=useState<SavedDemo[]>([]),[current,setCurrent]=useState<SavedDemo|null>(null);
  const [tab,setTab]=useState<'create'|'saved'>('create');
  const [share,setShare]=useState(''),[incoming,setIncoming]=useState('');
  const [generation,setGeneration]=useState<boolean|null>(null);
  const [embeddedCount,setEmbeddedCount]=useState(0);
  const pageDemos=[...new Map([
    ...demos.map(demo=>[demo.id,demo] as const),
    ...Array.from(inlineRoots.values()).filter(item=>item.host.isConnected).map(item=>[item.demo.id,item.demo] as const),
  ]).values()];
  const anchor=useRef<Element|null>(null),page=useRef(pageIdentity(location.href));
  const generatedAnchors=useRef(new Map<string,Element|null>());
  const pending=useRef(false),panel=useRef<HTMLElement>(null),launcher=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    void hydrateArticleEmbeds();
    const countTimer=setInterval(()=>setEmbeddedCount(inlineRoots.size),500);
    const observer=new MutationObserver(()=>void hydrateArticleEmbeds());
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>{observer.disconnect();clearInterval(countTimer);};
  },[]);
  useEffect(()=>{
    if(!open)return;
    let timer:number|undefined;
    const onSelection=()=>{
      const selection=window.getSelection();
      if(!selection?.toString().trim()||selection.anchorNode?.getRootNode()!==document)return;
      window.clearTimeout(timer);
      // Read the range while it still belongs to the article. Focusing the
      // sidebar can clear it before the debounce fires; rereading then would
      // accidentally capture the entire article instead of the selected text.
      let captured:ReturnType<typeof contextFromPage>;
      try {captured=contextFromPage(true);}
      catch(error){setContext(null);setConsent(false);setError(errorText(error));return;}
      timer=window.setTimeout(()=>{
        try {
          const next=captured;
          if(!next.context.selection||next.context.pageUrl!==pageIdentity(location.href))return;
          anchor.current=next.anchor;
          if(context?.text===next.context.text&&context.source.url===next.context.source.url)return;
          setContext(next.context);setDetectedMode(next.context.mode);setConsent(false);setError('');
          setQuestion(prev=>prev||(next.context.mode==='teach'?'怎样用互动演示，把这段内容讲清楚？':'这段话是什么意思？用具体情境帮我理解。'));
        } catch(error) {setContext(null);setConsent(false);setError(errorText(error));}
      },160);
    };
    document.addEventListener('selectionchange',onSelection);
    return()=>{document.removeEventListener('selectionchange',onSelection);window.clearTimeout(timer);};
  },[open,context]);

  function capture() {
    setDetectedMode(pageMode());
    try {
      const captured=contextFromPage();
      anchor.current=captured.anchor;setContext(captured.context);setError('');setConsent(false);
      setQuestion(captured.context.mode==='teach'?'怎样用互动演示，把这段内容讲清楚？':'这段话是什么意思？用具体情境帮我理解。');
    }catch(error){setContext(null);setConsent(false);setError(errorText(error));}
  }
  async function load() {
    const requestPage=page.current;
    try {const saved=await extensionRequest<SavedDemo[]>({type:'load',pageUrl:requestPage});if(page.current===requestPage)setDemos(saved);}
    catch(error){setError(errorText(error));}
  }
  function toggle(){if(!open&&!context)capture();setOpen(!open);}
  useEffect(()=>{
    const listener=(message:unknown)=>{if((message as {type?:string})?.type==='wanhu-toggle')toggle();};
    const openFromEmbed=(event:Event)=>{const demo=(event as CustomEvent<{demo?:SavedDemo}>).detail?.demo;if(demo){setCurrent(demo);setTab('saved');setError('');setNotice('已打开这份演示，可继续理解；作者模式下可到工坊调整。');void extensionRequest({type:'save',demo}).then(()=>load()).catch(()=>undefined);}if(!open){if(!context&&!demo)capture();setOpen(true);} else panel.current?.focus();};
    chrome.runtime.onMessage.addListener(listener);
    window.addEventListener('wanhu-open-sidebar',openFromEmbed);
    return()=>{chrome.runtime.onMessage.removeListener(listener);window.removeEventListener('wanhu-open-sidebar',openFromEmbed);};
  },[open,context]);
  useEffect(()=>{
    // The isolated content script lives for this document. SPA changes reset page-bound state.
    const timer=setInterval(()=>{
      const next=pageIdentity(location.href);
      if(next===page.current)return;
      page.current=next;setDetectedMode(pageMode());anchor.current=null;setContext(null);setCurrent(null);setShare('');setDemos([]);setConsent(false);setNotice('已切换页面，请重新选段。');
      generatedAnchors.current.clear();
      inlineRoots.forEach(item=>item.dispose());
      if(!pending.current)setError('');
    },800);
    return()=>clearInterval(timer);
  },[]);
  useEffect(()=>{
    if(!open)return;
    void load();
    void extensionRequest<{generation:boolean}>({type:'status'}).then(data=>setGeneration(data.generation)).catch(()=>setGeneration(false));
    panel.current?.focus();
  },[open]);
  useEffect(()=>{
    let active=true;setShare('');
    if(current)void encodeLesson(current.lesson).then(payload=>{if(active)setShare(__BACKEND_URL__+'/view#'+payload);}).catch(error=>{if(active)setError(errorText(error));});
    return()=>{active=false;};
  },[current]);
  async function save(demo:SavedDemo) {
    setCurrent(demo);
    try {await extensionRequest({type:'save',demo});await load();setNotice('已保存到此浏览器，下次打开这篇文章可以继续。');}
    catch(error){setError('演示已生成，但保存失败：'+errorText(error)+'。请复制分享链接保留。');}
  }
  async function generate() {
    if(!context||busy||!consent)return;
    const snapshot=structuredClone(context),requestPage=pageIdentity(location.href),requestAnchor=anchor.current;
    const anchorText=anchor.current instanceof HTMLElement?anchor.current.innerText.trim().slice(0,2000):undefined;
    setBusy(true);pending.current=true;setError('');setNotice('');
    try {
      const {lesson}=await extensionRequest<{lesson:Lesson}>({type:'generate',context:snapshot,question,consent:true});
      if(pageIdentity(location.href)!==requestPage)throw new Error('生成期间页面发生了变化，请回到原文章重新生成');
      const demo:SavedDemo={origin:'personal',mode:snapshot.mode,id:crypto.randomUUID(),pageUrl:requestPage,lesson,createdAt:new Date().toISOString(),anchorText,anchorSourceUrl:snapshot.source.url};
      generatedAnchors.current.set(demo.id,requestAnchor);
      await save(demo);
      // Generation is the author's primary action: place the preview immediately.
      try { insertDemo(demo,requestAnchor); setNotice('互动演示已生成，并已自动插入所选段落之后。'); }
      catch { setNotice('互动演示已生成，暂未找到可插入位置，可在结果区手动插入。'); }
    }catch(error){setError(errorText(error));}
    finally {setBusy(false);pending.current=false;}
  }
  function embed(demo:SavedDemo) {
    try {
      let target=generatedAnchors.current.get(demo.id)??(demo.anchorText?findAnchor(demo.anchorText,demo.anchorSourceUrl):null);
      // An explicit current selection can place an imported demo; it never changes editor text.
      if(!target&&(!demo.anchorText||context?.selection))target=anchor.current;
      insertDemo(demo,target);setNotice('演示已插入所选段落之后。原文未改动。');
    }catch(error){setError(errorText(error));}
  }
  async function openWorkshop() {
    if(!current)return;
    try {await extensionRequest({type:'open-workshop',payload:await encodeLesson(current.lesson),mode:context?.mode??detectedMode});}
    catch(error){setError(errorText(error));}
  }
  async function importLink() {
    setError('');
    try {
      const payload=articleSharePayload(incoming.trim(),__BACKEND_URL__);
      if(!payload)throw new Error('请使用玩乎工坊生成的阅读链接（格式为 /view#v1…）');
      const lesson=await decodeLesson(payload);
      await save({id:crypto.randomUUID(),origin:'imported',mode:detectedMode,pageUrl:page.current,lesson,createdAt:new Date().toISOString()});
      setIncoming('');
    }catch(error){setError(errorText(error));}
  }
  return <div className="zw-shell">
    <button ref={launcher} className="zw-launcher" onMouseDown={event=>event.preventDefault()} onClick={toggle} aria-label="打开玩乎" aria-expanded={open}><img className="zw-launcher-icon zw-launcher-mascot" src={__MASCOT_ICON__} alt="刘看山" width={40} height={40}/><span>玩乎</span><i>{embeddedCount?`本页 ${embeddedCount} 个演示`:'把知识试明白'}</i></button>
    {open&&<aside className="zw-panel" ref={panel} tabIndex={-1} aria-label="玩乎工作区" onKeyDown={event=>{if(event.key==='Escape'){setOpen(false);launcher.current?.focus();}}}>
      <header className="zw-header"><div className="zw-brand"><span className="zw-monogram"><img src={__BRAND_ICON__} alt="玩乎" width={42} height={42}/></span><div><strong>知识，就在这里发生</strong><small>WANHU · FOR ZHIHU</small></div></div><button className="zw-close" onClick={()=>{setOpen(false);launcher.current?.focus();}} aria-label="关闭玩乎">×</button></header>
      <nav className="zw-tabs" aria-label="插件功能"><button className={tab==='create'?'active':''} onClick={()=>setTab('create')}>围绕这段，动手理解</button><button className={tab==='saved'?'active':''} onClick={()=>{setTab('saved');setError('');void load();}}>本页演示 <span>{pageDemos.length}</span></button></nav>
      <div className="zw-scroll">
        {tab==='create'?<>
          <div className="zw-step"><span>{(context?.mode??detectedMode)==='teach'?'作者模式 · 01 / 选取材料':'读者模式 · 01 / 选取材料'}</span><button disabled={busy} onMouseDown={event=>event.preventDefault()} onClick={capture}>重新读取选段 ↻</button></div>
          {context?<div className="zw-source"><div><span className="zw-dot"/>{context.mode==='teach'?'写作中的草稿':'正在读的文章'} · {context.selection?'所选段落':'可见正文'}</div><strong>{context.source.title}</strong><small>{context.source.author||'作者信息未识别'} · <a href={context.source.url} target="_blank" rel="noreferrer">知乎来源 ↗</a></small></div>:<div className="zw-empty"><strong>从不理解的那一段开始</strong><p>在正文中划选一段文字，材料会自动更新到这里；不用关闭侧边栏。</p></div>}
          {context&&<>
            <label className="zw-label" htmlFor="zw-material">将用于生成的文字 <span>{context.text.length.toLocaleString()} / 20,000</span></label>
            <textarea id="zw-material" rows={7} value={context.text} maxLength={20000} disabled={busy} onChange={event=>{setContext({...context,text:event.target.value});setConsent(false);}}/>
            <div className="zw-modes" aria-label="使用场景"><button disabled={busy} aria-pressed={context.mode==='learn'} onClick={()=>setContext({...context,mode:'learn'})}>读者 · 帮我弄懂</button><button disabled={busy} aria-pressed={context.mode==='teach'} onClick={()=>setContext({...context,mode:'teach'})}>创作者 · 帮我讲清</button></div>
            <label className="zw-label" htmlFor="zw-question">02 / {context.mode==='teach'?'想把哪一点讲清楚？':'这次想弄明白什么？'}</label><textarea id="zw-question" rows={2} maxLength={200} disabled={busy} value={question} onChange={event=>setQuestion(event.target.value)}/><div className="zw-prompts" aria-label="常用提问"><button disabled={busy} onClick={()=>setQuestion(context.mode==='teach'?'这段内容最容易被误解的地方是什么？':'请用一个真实生活中的例子解释这段话。')}>举个例子</button><button disabled={busy} onClick={()=>setQuestion(context.mode==='teach'?'怎样把这段拆成读者能记住的 3 个关键点？':'把这段拆成 3 个我能记住的关键点。')}>提炼重点</button><button disabled={busy} onClick={()=>setQuestion('如果我不相信这段话，应该先验证什么？')}>检查依据</button></div>
            <ThinkingAssist mode={context.mode} material={context.text} disabled={busy} onUseQuestion={setQuestion} request={requestAssistance}/><label className="zw-consent"><input type="checkbox" checked={consent} disabled={busy} onChange={event=>setConsent(event.target.checked)}/><span>将上方文字发送至玩乎生成服务，我会核对生成的讲解与原文。</span></label>
            <button className="zw-primary" disabled={busy||!consent||!context.text.trim()||!question.trim()} onClick={()=>void generate()}>{busy?'正在读原文、构建互动…':'生成这段的互动演示 ↗'}</button>
            {busy&&<p className="zw-hint" role="status">通常需要 20–50 秒，可继续读文章。请保持在当前页面。</p>}
          </>}
          {generation===false&&<p className="zw-service">生成服务暂时不可用，请稍后重新打开侧边栏。已保存的演示仍可体验。</p>}
        </>:<>
          <div className="zw-step"><span>本页全部演示 · {pageDemos.length} 份</span><div><button onClick={collapseAllInline}>收起正文</button><button onClick={()=>void load()}>刷新 ↻</button></div></div>
          {!pageDemos.length&&<div className="zw-empty"><strong>这里会出现文章附带的演示</strong><p>作者把玩乎分享链接贴进知乎后，安装插件的读者会在原文旁边看到互动卡片。你也可以选中任何段落，生成自己的理解。</p><button className="zw-secondary" onClick={()=>{setTab('create');capture();}}>从当前文章开始理解 ↗</button></div>}
          {pageDemos.map(demo=><button className={'zw-saved '+(demo.id===current?.id?'active':'')} key={demo.id} onClick={()=>{setCurrent(demo);setNotice('');setError('');}}><span>{demoLabel(demo)} · {experimentNames[demo.lesson.experiment.type]}</span><strong>{demo.lesson.title}</strong><small>{new Date(demo.createdAt).toLocaleString('zh-CN')} · 打开 →</small></button>)}
          <label className="zw-label" htmlFor="zw-incoming">打开作者分享的演示</label><textarea id="zw-incoming" rows={3} value={incoming} onChange={event=>setIncoming(event.target.value)} placeholder="粘贴玩乎阅读链接" maxLength={14000}/><button className="zw-secondary" disabled={!incoming.trim()||busy} onClick={()=>void importLink()}>载入分享演示</button>
        </>}
        {error&&<p className="zw-error" role="alert">{error}</p>}
        {notice&&<p className="zw-notice" role="status">{notice}</p>}
        {current&&<section className="zw-result" aria-label="生成结果"><span className="zw-result-label">{demoLabel(current)} / {experimentNames[current.lesson.experiment.type]}</span><h2>{current.lesson.title}</h2><p>{current.lesson.goal}</p>{tab==='saved'&&<ThinkingAssist mode={detectedMode} material={current.lesson.sources.map(source=>source.excerpt).join('\n\n')||current.lesson.intro} request={requestAssistance}/>}<button className="zw-primary" onClick={()=>embed(current)}>插入正文，开始互动 ↓</button><small className="zw-hint">这一步只是在当前知乎页面预览，原文不会被改写。</small><button className="zw-secondary" onClick={()=>void openWorkshop()}>{(context?.mode??detectedMode)==='teach'?'到工坊修改讲解与演示 ↗':'到网页继续理解 ↗'}</button>{share&&<><label className="zw-label" htmlFor="zw-share">发布到知乎文章</label><input id="zw-share" readOnly value={share} onFocus={event=>event.target.select()}/><button className="zw-copy" onClick={()=>void navigator.clipboard.writeText(share).then(()=>setNotice('分享链接已复制。请在知乎编辑器中作为普通链接粘贴；安装玩乎的读者会自动展开演示。')).catch(()=>setError('复制受限，请选中上方链接手动复制。'))}>复制分享链接 ↗</button><button className="zw-copy" onClick={()=>void navigator.clipboard.writeText(`[${current.lesson.title}](${share})`).then(()=>setNotice('带标题链接已复制，可直接粘贴到支持 Markdown 的编辑器。')).catch(()=>setError('复制受限，请手动复制上方链接。'))}>复制带标题链接</button><small className="zw-hint">要让读者看到，请把上方分享链接贴进知乎文章。未安装插件的读者仍可点击链接打开完整网页。</small></>}</section>}
        <footer className="zw-footer"><strong>玩乎如何融入知乎</strong><small>插件版本 0.4.2 · <a href={__BACKEND_URL__+"/extension"} target="_blank" rel="noreferrer">更新与安装说明 ↗</a></small><p>作者在写作时生成互动演示，把分享链接贴进文章；读者打开文章后，玩乎会在链接附近自动展开。正文、作者署名和知乎来源始终保留。</p><small>卡片标注“作者附带”时，表示它来自文章中的玩乎分享链接；读者自己生成的解释只保存在自己的浏览器中。</small></footer>
      </div>
    </aside>}
  </div>;
}
createRoot(mount).render(<App/>);
