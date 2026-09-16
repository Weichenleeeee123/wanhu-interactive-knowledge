'use client';
import { useEffect, useRef, useState } from 'react';
import { readApiResponse } from '../lib/api-response';
import { AssistResultSchema, type AssistInput, type AssistTurn } from '../lib/assist';

function AnswerText({text}:{text:string}) {
  return <>{text.split(/(\*\*[^*]+\*\*)/g).map((part,index)=>part.startsWith('**')&&part.endsWith('**')?<strong key={index}>{part.slice(2,-2)}</strong>:part)}</>;
}

export async function requestAssist(input:AssistInput,signal?:AbortSignal):Promise<{answer:string}> {
  const response=await fetch('/api/assist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal:signal??AbortSignal.timeout(50000)});
  const body=await readApiResponse(response);
  if(!response.ok)throw new Error(body.error||'暂时无法回答，请重试');
  return AssistResultSchema.parse(body);
}

export function ThinkingAssist({mode,material,disabled=false,onUseQuestion,request=requestAssist}:{
  mode:'teach'|'learn';material:string;disabled?:boolean;onUseQuestion?:(question:string)=>void;
  request?:(input:AssistInput,signal?:AbortSignal)=>Promise<{answer:string}>;
}) {
  const [question,setQuestion]=useState(''),[turns,setTurns]=useState<AssistTurn[]>([]);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[consent,setConsent]=useState(false),[notice,setNotice]=useState('');
  const operation=useRef<AbortController|null>(null),revision=useRef(0);
  useEffect(()=>{revision.current++;operation.current?.abort();setBusy(false);setTurns([]);setConsent(false);setError('');setNotice('');return()=>{revision.current++;operation.current?.abort();};},[material,mode]);
  async function ask() {
    if(busy||disabled||!consent||!question.trim()||!material.trim())return;
    const generation=++revision.current,controller=new AbortController();operation.current=controller;
    const timeout=setTimeout(()=>controller.abort(),50000);
    const asked=question.trim();setBusy(true);setError('');setNotice('');
    try {
      const result=AssistResultSchema.parse(await request({mode,material,question:asked,history:turns.slice(-4),consent:true},controller.signal));
      if(revision.current!==generation)return;
      setTurns(prev=>[...prev.slice(-3),{question:asked,answer:result.answer}]);setQuestion('');
    } catch(error){if(revision.current===generation)setError(controller.signal.aborted?'请求已停止，问题已保留，可重试。':error instanceof Error?error.message:'暂时无法回答');}
    finally{clearTimeout(timeout);if(revision.current===generation)setBusy(false);}
  }
  const suggestions=mode==='teach'?
    [['检查论证','读者需要哪些前置知识？这段论证是否跳过了关键步骤？'],['找个类比','给这段内容一个生活类比，说明类比的适用边界。'],['理清提纲','给这段内容列一个简短的讲解提纲，最多三点。'],['挑互动切口','这段最值得让读者动手验证的一个问题是什么？']]:
    [['解释这段','用简单的话解释这段内容。'],['补前置知识','理解这段之前，我需要知道哪些概念？'],['换个例子','换一个日常例子解释这段内容，并说明例子的边界。']];
  return <details className="thinking-assist">
    <summary>{mode==='teach'?'先聊清楚，再做演示':'这段没懂？先问一句'}<span>可选 · 直接回答</span></summary>
    <p className="assist-note">{mode==='teach'?'只围绕这段帮你构思，不改写正文。':'不用生成整份作品，也能先得到解释。'} 提问会发送当前材料与最近 4 轮对话；更换材料后对话重置。</p>
    {!material.trim()&&<p className="assist-note">先导入或选取一段文字。</p>}
    <div className="assist-prompts">{suggestions.map(([label,prompt])=><button type="button" key={label} disabled={busy||disabled} onClick={()=>setQuestion(prompt)}>{label}</button>)}</div>
    <div className="assist-conversation" aria-live="polite">{turns.map((turn,index)=><article key={index}><strong>你：{turn.question}</strong><p><AnswerText text={turn.answer}/></p>{onUseQuestion&&<button type="button" disabled={busy||disabled} onClick={()=>{onUseQuestion(turn.question.slice(0,200));setNotice('已填入演示问题，核对后再点击生成。');}}>用这个问题制作演示</button>}</article>)}</div>
    <label className="assist-question">{turns.length?'继续追问':'想问什么'}<textarea rows={2} maxLength={500} value={question} disabled={busy||disabled} onChange={event=>setQuestion(event.target.value)} placeholder={mode==='teach'?'这段是不是少解释了一步？':'为什么会这样？'}/></label>
    <label className="assist-consent"><input type="checkbox" checked={consent} disabled={busy||disabled} onChange={event=>setConsent(event.target.checked)}/>同意发送本段材料，用于这次对话</label>
    <div className="assist-actions"><button type="button" disabled={busy||disabled||!consent||!question.trim()||!material.trim()||material.length>20000} onClick={()=>void ask()}>{busy?'正在思考…':turns.length?'发送追问':'先回答这个问题'}</button>{busy&&<button type="button" onClick={()=>{revision.current++;operation.current?.abort();setBusy(false);setError('已停止等待，问题已保留。');}}>停止</button>}</div>
    {error&&<p role="alert" className="error-message">{error}</p>}{notice&&<p role="status">{notice}</p>}
    {turns.length>0&&<small className="assist-note">AI 辅助分析，请结合原文判断。对话仅保留在当前页面。</small>}
  </details>;
}
