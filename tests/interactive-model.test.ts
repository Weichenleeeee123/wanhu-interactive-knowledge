import { describe, expect, it, vi } from 'vitest';
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
  it('gives a repair the failed output and exact field path without weakening validation', async () => {
    const wrong = { ...queueLesson, experiment: { ...queueModel, stocks: [{ ...queueModel.stocks[0], next: 'queue + missing_arrival' }] } };
    const provider = vi.fn().mockResolvedValueOnce(JSON.stringify(wrong)).mockResolvedValueOnce(JSON.stringify(queueLesson));
    await expect(generateLesson({mode:'learn',material:queueModel.evidence.quote,question:'',sources:[],standardModel:true},{provider})).resolves.toHaveProperty('lesson');
    const repair = provider.mock.calls[1][0];
    expect(repair.prompt).toContain('experiment.stocks.0.next');
    expect(repair.prompt).toContain('queue + missing_arrival');
    expect(repair.prompt).toContain('上次不可信输出');
  });
});
