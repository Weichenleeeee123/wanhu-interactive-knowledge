import { expect, it } from 'vitest';
import { LessonSchema } from '../src/lib/lesson';
import { examples } from '../src/lib/examples';
import { generateLesson } from '../src/lib/server/generate';
import { encodeLesson, decodeLesson } from '../src/lib/share';
export const animation = {
  type: 'scene-animation', rationale: '用位置变化演示传递过程', assumptions: '图形是示意，不按真实比例。',
  evidence: { sourceId: 'material', quote: '消息先从发送方传到中转站，再到接收方。' },
  objects: [{ id: 'message', shape: 'circle', label: '消息', color: 'blue', detail: '沿三个位置传递。' }],
  frames: [
    { title: '发送', caption: '消息位于发送方。', poses: [{ id: 'message', x: 90, y: 160, width: 60, height: 60, opacity: 1, rotation: 0 }] },
    { title: '中转', caption: '消息进入中转站。', poses: [{ id: 'message', x: 300, y: 160, width: 60, height: 60, opacity: 1, rotation: 0 }] },
    { title: '接收', caption: '消息抵达接收方。', poses: [{ id: 'message', x: 520, y: 160, width: 60, height: 60, opacity: 1, rotation: 0 }] },
  ],
};
export const branching = {
  type: 'branching-path', rationale: '对照不同条件下的处理路径', assumptions: '只是本文步骤的简化，不代表通用流程。',
  evidence: animation.evidence, start: 'start',
  nodes: [
    { id: 'start', title: '发送消息', body: '选择传递条件，观察后续流程。', choices: [{ label: '通道可用', target: 'delivered' }, { label: '通道暂不可用', target: 'retry' }] },
    { id: 'retry', title: '等待后重试', body: '消息暂存于发送方。', choices: [{ label: '恢复后发送', target: 'delivered' }] },
    { id: 'delivered', title: '消息抵达', body: '接收方读取消息。', choices: [] },
  ],
};
const lesson = (experiment: unknown) => ({ ...examples['monty-hall'], sources: [], sourceIds: [], experiment });
it('shares both generated visual forms without losing frames or paths', async () => {
  for (const model of [animation, branching]) {
    const parsed = LessonSchema.parse(lesson(model));
    expect(await decodeLesson(await encodeLesson(parsed))).toEqual(parsed);
  }
});
it('rejects missing poses and graph targets', () => {
  expect(LessonSchema.safeParse(lesson({ ...animation, frames: [{ ...animation.frames[0], poses: [] }, ...animation.frames.slice(1)] })).success).toBe(false);
  expect(LessonSchema.safeParse(lesson({ ...branching, start: 'missing' })).success).toBe(false);
});
it('offers both types to the model and verifies original evidence', async () => {
  for (const model of [animation, branching]) {
    let prompt = '';
    const result = await generateLesson({ mode: 'learn', material: animation.evidence.quote, question: '做成演示', sources: [], standardModel: true }, { provider: async c => { prompt = c.prompt; return JSON.stringify(lesson(model)); } });
    expect(prompt).toContain('scene-animation'); expect(prompt).toContain('branching-path');
    expect('lesson' in result && result.lesson.experiment.type).toBe(model.type);
    await expect(generateLesson({ mode: 'learn', material: '其他原文', question: '', sources: [], standardModel: true }, { provider: async () => JSON.stringify(lesson(model)) })).rejects.toThrow();
  }
});
