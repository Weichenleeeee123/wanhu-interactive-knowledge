import { expect, it } from 'vitest';
import { showcase, showcaseForUrl } from '../src/lib/showcase';
import { LessonSchema } from '../src/lib/lesson';
import { encodeLesson, decodeLesson } from '../src/lib/share';
import { simulateModel } from '../src/lib/interactive-model';
import { branchLayout, scenePoses } from '../src/lib/visual-experiences';
import { createWork, saveWork, readWork } from '../src/lib/works';
it('contains ten distinct real article identities and shareable, valid demonstrations', async()=>{
  expect(showcase).toHaveLength(10); expect(new Set(showcase.map(i=>i.articleKey)).size).toBe(10);
  for(const item of showcase){
    expect(LessonSchema.safeParse(item.lesson).success).toBe(true);
    expect(showcaseForUrl(item.source.url)?.id).toBe(item.id);
    expect(await decodeLesson(await encodeLesson(item.lesson))).toEqual(item.lesson);
    const e=item.lesson.experiment;if(e.type==='interactive-model')expect(simulateModel(e).error).toBeNull();
    if(e.type==='scene-animation'){ expect(scenePoses(e,.5)).toHaveLength(e.objects.length);expect(scenePoses(e,999)).toEqual(e.frames.at(-1)!.poses); }
  }
});
it('matches equivalent article links but never editors, question lists or lookalike hosts',()=>{
  expect(showcaseForUrl('https://zhuanlan.zhihu.com/p/597424073?utm_source=test')?.id).toBe('chloroplast');
  for(const url of ['https://zhuanlan.zhihu.com/p/597424073/edit','https://www.zhihu.com/question/48275668','https://evil.test/p/597424073'])expect(showcaseForUrl(url)).toBeNull();
});
it('persists new types while rejecting malformed stored lessons',()=>{
  const map=new Map<string,string>();const storage={getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);},key:(i:number)=>Array.from(map.keys())[i]??null,get length(){return map.size;}};
  for(const item of showcase){const work=createWork({lesson:item.lesson});saveWork(storage,work);expect(readWork(storage,work.id)?.lesson).toEqual(item.lesson);}
  expect(()=>saveWork(storage,createWork({lesson:{oops:true} as never}))).toThrow();
});

it('lays out the hand-authored decision paths below their parents',()=>{
  for(const {lesson} of showcase){const graph=lesson.experiment;if(graph.type!=='branching-path')continue;
    const layout=branchLayout(graph);for(const n of graph.nodes){const p=layout.nodes.get(n.id)!;expect(p.x-p.width/2).toBeGreaterThanOrEqual(0);expect(p.x+p.width/2).toBeLessThanOrEqual(640);for(const c of n.choices)expect(layout.nodes.get(c.target)!.y).toBeGreaterThan(p.y);}
  }
});
