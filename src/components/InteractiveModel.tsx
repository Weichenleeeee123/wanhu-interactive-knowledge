"use client";
import { useEffect, useMemo, useState } from 'react';
import type { InteractiveModel as ModelData } from '@/lib/interactive-model';
import { defaultControls, simulateModel } from '@/lib/interactive-model';
export function InteractiveModel({ model, onActivity = () => {} }: { model: ModelData; onActivity?: (text: string) => void }) {
  const [controls,setControls]=useState(defaultControls(model)),[step,setStep]=useState(0),[playing,setPlaying]=useState(false),[metric,setMetric]=useState(model.stocks[0].id);
  const [baseline,setBaseline]=useState<Record<string,number>|null>(null);
  const run=useMemo(()=>simulateModel(model,controls),[model,controls]);
  const reference=useMemo(()=>baseline?simulateModel(model,baseline):null,[model,baseline]);
  const end=Math.max(0,run.frames.length-1),time=Math.min(step,end),stock=model.stocks.find(s=>s.id===metric)??model.stocks[0];
  const frame=run.frames[time],refFrame=reference?.frames[time];
  const values=[...run.frames,...(reference?.frames??[])].map(f=>f[stock.id]);
  const low=Math.min(0,...values),high=Math.max(1,...values),range=high-low;
  const x=(t:number)=>50+t/model.duration*530,y=(v:number)=>160-(v-low)/range*135;
  const points=(frames:Record<string,number>[])=>frames.slice(0,time+1).map((f,i)=>`${x(i)},${y(f[stock.id])}`).join(' ');
  useEffect(()=>{if(!playing)return;const timer=setInterval(()=>setStep(s=>Math.min(end,s+1)),350);return()=>clearInterval(timer);},[playing,end]);
  useEffect(()=>{if(step>=end)setPlaying(false);},[step,end]);
  function seek(value:number){setPlaying(false);setStep(value);onActivity(`观察到第 ${value} ${model.stepLabel}，可调整条件再次比较。`);}
  const format=(v:number)=>Math.abs(v)>=100000?v.toExponential(2):Number(v.toFixed(2)).toLocaleString('zh-CN');
  return <div className="interactive-model" aria-label="可调参数模拟器">
    <div className="model-rule"><strong>改一个条件，看过程怎样展开</strong><p>{model.rules}</p><small>{model.assumptions}</small></div>
    <div className="model-controls">{model.controls.map(c=><label key={c.id}><span>{c.label} <small>{c.unit}</small></span><input type="range" min={c.min} max={c.max} step={c.step} value={controls[c.id]} onChange={e=>{setControls(v=>({...v,[c.id]:Number(e.target.value)}));seek(0);onActivity(`调整了${c.label}，从头比较变化。`);}}/><output>{format(controls[c.id])}</output></label>)}</div>
    <label>观察哪个量 <select aria-label="观察的变化量" value={stock.id} onChange={e=>setMetric(e.target.value)}>{model.stocks.map(s=><option key={s.id} value={s.id}>{s.label}（{s.unit||'无单位'}）</option>)}</select></label>
    <div className="model-chart"><svg viewBox="0 0 620 200" role="img" aria-label={`${stock.label}随${model.stepLabel}变化，实线为当前条件，虚线为对照`}>
      <path d="M50 20V160H580" fill="none" stroke="#b1c6da"/>
      <text x="45" y="25" textAnchor="end" fontSize="10">{format(high)}</text><text x="45" y="160" textAnchor="end" fontSize="10">{format(low)}</text>
      <text x="50" y="184" fontSize="12">0</text><text x="580" y="184" textAnchor="end" fontSize="12">{model.duration} {model.stepLabel}</text>
      {reference&&<polyline points={points(reference.frames)} fill="none" stroke="#ce731e" strokeWidth="3" strokeDasharray="6 5"/>}
      <polyline points={points(run.frames)} fill="none" stroke="#1677e8" strokeWidth="3"/>
      {frame&&<circle cx={x(time)} cy={y(frame[stock.id])} r="5" fill="#1677e8"/>}
    </svg><div className="model-readout" aria-live="polite"><strong>第 {time} {model.stepLabel}</strong><span>{stock.label}：{frame?format(frame[stock.id]):'无法计算'} {stock.unit}</span>{refFrame&&<span>对照：{format(refFrame[stock.id])} {stock.unit}</span>}</div></div>
    <label className="visual-scrubber">回看过程<input aria-label="模拟进度" type="range" min={0} max={end} value={time} onChange={e=>seek(Number(e.target.value))}/></label>
    <div className="model-actions"><button className="button" disabled={time===0} onClick={()=>seek(time-1)}>← 单步后退</button><button className="button primary" disabled={end===0} onClick={()=>{if(time>=end)setStep(0);setPlaying(!playing);onActivity('播放模拟，观察变化轨迹。');}}>{playing?'暂停':'播放模拟'}</button><button className="button" onClick={()=>seek(Math.min(end,time+1))} disabled={time>=end}>单步前进 →</button><button className="text-button" onClick={()=>seek(end)}>跑到结果</button></div>
    <div className="model-actions"><button className="button" disabled={!!run.error} onClick={()=>{setBaseline({...controls});onActivity('固定当前条件为对照，可改变参数比较轨迹。');}}>固定当前条件作对照</button>{baseline&&<button className="text-button" onClick={()=>setBaseline(null)}>取消对照</button>}</div>
    {baseline&&<p className="field-note">橙色虚线：{model.controls.map(c=>`${c.label} ${baseline[c.id]}${c.unit}`).join(' · ')}。调整滑杆后重新播放；两条曲线使用相同坐标尺度。</p>}
    {run.error&&<p className="error-message" role="alert">{run.error}，仅显示成功计算的步骤。</p>}
    <details className="visual-notes"><summary>计算规则与原文依据</summary>{model.stocks.map(s=><p key={s.id}>{s.label}（{s.id}）：初始 {s.initial}；下一步 {s.next}</p>)}<blockquote>{model.evidence.quote}</blockquote></details>
  </div>;
}
