import {useState} from 'react';
import {ArticleExploration} from '../components/ArticleExploration';
import {GradientExperiment} from '../components/GradientExperiment';
import {MontyExperiment} from '../components/MontyExperiment';
import {InteractiveModel} from '../components/InteractiveModel';
import {experimentNames,type Lesson} from '../lib/lesson';

export function InlineExperience({lesson}:{lesson:Lesson}) {
  const [activity,setActivity]=useState('');
  const [copied,setCopied]=useState(false);
  async function copyTakeaway(){try{await navigator.clipboard.writeText(`我从《${lesson.title}》带走的理解：${lesson.challenge}`);setCopied(true);setTimeout(()=>setCopied(false),1800);}catch{setActivity('复制受限，请展开讲解后手动选择文字。');}}
  return <article className="zw-experience">
    <span className="zw-result-label">{experimentNames[lesson.experiment.type]} · AI 辅助讲解，请核对原文</span>
    <h2>{lesson.title}</h2><p className="zw-experience-goal">{lesson.goal}</p>
    {lesson.experiment.type==='interactive-model'?<InteractiveModel model={lesson.experiment} onActivity={setActivity}/>:lesson.experiment.type==='article-exploration'?<ArticleExploration experiment={lesson.experiment} sources={lesson.sources} onActivity={setActivity} onChallenge={()=>undefined}/>:lesson.experiment.type==='gradient-descent'?<GradientExperiment initialX={lesson.experiment.initialX} learningRate={lesson.experiment.learningRate} onActivity={setActivity} onChallenge={()=>undefined}/>:<MontyExperiment trials={lesson.experiment.trials} onActivity={setActivity} onChallenge={()=>undefined}/>}
    {activity&&<p className="zw-hint" role="status">{activity}</p>}
    <details className="zw-more"><summary>展开讲解与原文来源</summary><p>{lesson.explanation}</p><p><strong>带走一个理解：</strong>{lesson.challenge}</p><button className="zw-takeaway" onClick={()=>void copyTakeaway()}>{copied?'已复制到剪贴板':'复制我的理解结论'}</button>{lesson.sources.map(source=><div className="zw-inline-source" key={source.id}><strong>{source.title}</strong><small>{source.author||'作者信息未提供'}</small><blockquote>{source.excerpt}</blockquote><a href={source.url} target="_blank" rel="noreferrer">核对原文 ↗</a></div>)}<p className="zw-hint">互动讲解不代表原作者参与或认可；材料可能为节选。</p></details>
  </article>;
}
