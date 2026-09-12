"use client";
import type { Lesson } from '@/lib/lesson';

export type LearningSession = { prediction: string | null; activity: string; verified: boolean | null };

export function PredictionCard({ experiment, value, onSelect }: {
  experiment: Lesson['experiment']; value: string | null; onSelect: (value: string) => void;
}) {
  const monty = experiment.type === 'monty-hall';
  const options = monty ? ['换门胜率 1/3','换门胜率 1/2','换门胜率 2/3'] : ['会靠近谷底','会原地震荡','会越走越远', ...(experiment.initialX === 0 ? ['会停在谷底'] : [])];
  return <div className="prediction-card">
    <h3>{monty ? '只剩两扇门，你猜换门的胜率是？' : `按当前初始参数：x = ${experiment.initialX}，学习率 ${experiment.learningRate}，你猜会怎样？`}</h3>
    <p className="small muted">先留下直觉。此刻不判对错，带着它去做实验。</p>
    <div className="prediction-options">
      {options.map((option,index) => <button key={option} disabled={value !== null}
        aria-label={`我的预测：${option}`} aria-pressed={value === option}
        className={`prediction-option ${value === option ? 'is-picked' : ''}`}
        onClick={() => onSelect(option)}><span>{String.fromCharCode(65+index)}</span>{option}{value===option && <i>已记录</i>}</button>)}
    </div>
    {value && <p className="prediction-confirmation" role="status">预测已记下。现在，让实验来回答。</p>}
  </div>;
}

export function LearningRecap({ lesson, session }: { lesson: Lesson; session: LearningSession }) {
  const {prediction,activity,verified}=session;
  const complete = prediction !== null && !!activity && verified === true;
  function download() {
    const content = [lesson.title, '', '我的预测：'+(prediction??'未记录'), '操作记录：'+(activity||'尚未操作'),
      '挑战结果：'+(verified===true?'通过':verified===false?'需要再观察':'尚未作答'), '', '本次学习目标：'+lesson.goal,
      '', '带走一个理解：'+lesson.challenge, '', '材料来源：', ...lesson.sources.map(s=>`${s.title} / ${s.author||'作者未提供'}\n${s.url}`),
      '', '这是个人页面操作记录，不代表对学习效果的评估。'].join('\n');
    const url = URL.createObjectURL(new Blob([content], {type:'text/plain;charset=utf-8'}));
    const link=document.createElement('a'); link.href=url;link.download='知玩-我的探索记录.txt';link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <section className={`learning-recap ${complete?'is-complete':''}`} aria-label="我的探索记录">
    <div className="section-line"><div><span className="eyebrow">YOUR EXPLORATION</span><h2>{complete?'把这次理解，带走。':'我的探索记录'}</h2></div><span className="recap-count">{Number(!!prediction)+Number(!!activity)+Number(verified===true)} / 3</span></div>
    <ol>
      <li><span>01 · 我的直觉</span><strong>{prediction ?? '在实验前留下一个预测'}</strong></li>
      <li><span>02 · 我做了什么</span><strong>{activity || '动手操作一次实验'}</strong></li>
      <li><span>03 · 规则验证</span><strong>{verified===true?'挑战已通过':verified===false?'再观察一次，然后重试':'完成实验中的挑战题'}</strong></li>
    </ol>
    <div className="recap-footer"><p>仅记录本次页面体验，不上传个人学习记录。</p><button className="button" disabled={!prediction&&!activity&&verified===null} onClick={download}>保存探索记录 ↓</button></div>
  </section>;
}
