"use client";
import type { Lesson } from '@/lib/lesson';
export function VisualEditor({ lesson, onChange }: { lesson: Lesson; onChange: (lesson: Lesson, group?: string) => void }) {
  const exp = lesson.experiment;
  if (exp.type !== 'scene-animation' && exp.type !== 'branching-path') return null;
  return <div className="visual-editor"><p className="field-note">画面与路径已生成。按需调整讲解，右侧立即预览；不需要填写全部字段。</p>
    <label>为什么采用这种演示<textarea maxLength={240} value={exp.rationale} onChange={e=>onChange({...lesson,origin:'manual',experiment:{...exp,rationale:e.target.value}},'rationale')}/></label>
    <label>简化与适用边界<textarea maxLength={600} value={exp.assumptions} onChange={e=>onChange({...lesson,origin:'manual',experiment:{...exp,assumptions:e.target.value}},'assumptions')}/></label>
    {exp.type==='scene-animation'?exp.frames.map((frame,i)=><details key={i}><summary>分镜 {i+1} · {frame.title}</summary><label>分镜标题<input maxLength={40} value={frame.title} onChange={e=>onChange({...lesson,origin:'manual',experiment:{...exp,frames:exp.frames.map((f,j)=>i===j?{...f,title:e.target.value}:f)}},`frame-title-${i}`)}/></label><label>分镜讲解<textarea maxLength={400} value={frame.caption} onChange={e=>onChange({...lesson,origin:'manual',experiment:{...exp,frames:exp.frames.map((f,j)=>i===j?{...f,caption:e.target.value}:f)}},`frame-caption-${i}`)}/></label></details>):exp.nodes.map((node,i)=><details key={node.id}><summary>路径节点 {i+1} · {node.title}</summary><label>节点标题<input maxLength={24} value={node.title} onChange={e=>onChange({...lesson,origin:'manual',experiment:{...exp,nodes:exp.nodes.map((n,j)=>i===j?{...n,title:e.target.value}:n)}},`node-title-${i}`)}/></label><label>情境讲解<textarea maxLength={500} value={node.body} onChange={e=>onChange({...lesson,origin:'manual',experiment:{...exp,nodes:exp.nodes.map((n,j)=>i===j?{...n,body:e.target.value}:n)}},`node-body-${i}`)}/></label><p className="small">{node.choices.map(c=>c.label).join(' / ') || '此处结束，可返回比较另一条路径'}</p></details>)}
  </div>;
}
