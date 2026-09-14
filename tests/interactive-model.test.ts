import { describe, expect, it } from 'vitest';
import { LessonSchema } from '../src/lib/lesson';
import { generateLesson } from '../src/lib/server/generate';
import { encodeLesson, decodeLesson } from '../src/lib/share';
import { queueLesson, queueModel } from './model-fixture';

describe('generated interactive models', () => {
  it('accepts a calculable model and preserves it in a share link', async () => {
    const lesson = LessonSchema.parse(queueLesson);
    expect(await decodeLesson(await encodeLesson(lesson))).toEqual(lesson);
  });
  it('rejects executable expressions, missing variables and duplicate identifiers', () => {
    for (const next of ['fetch(1)', 'globalThis.alert(1)', 'unknown + 1', 'queue;alert(1)']) {
      expect(LessonSchema.safeParse({ ...queueLesson, experiment: { ...queueModel, stocks: [{ ...queueModel.stocks[0], next }] } }).success).toBe(false);
    }
    expect(LessonSchema.safeParse({ ...queueLesson, experiment: { ...queueModel, controls: [queueModel.controls[0], queueModel.controls[0]] } }).success).toBe(false);
  });
  it('generates a model with checked original evidence', async () => {
    const result = await generateLesson({ mode: 'learn', material: queueModel.evidence.quote, question: '做成可以调参数的积压模拟', sources: [], standardModel: true }, {
      provider: async ({ prompt }) => { expect(prompt).toContain('interactive-model'); return JSON.stringify(queueLesson); },
    });
    expect('lesson' in result && result.lesson.experiment.type).toBe('interactive-model');
  });
  it('does not accept invented model evidence', async () => {
    await expect(generateLesson({ mode: 'teach', material: '没有对应原句', question: '', sources: [], standardModel: true }, { provider: async () => JSON.stringify(queueLesson) })).rejects.toThrow();
  });
});
