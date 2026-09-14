import { z } from 'zod';
import { compileExpression, reservedModelIds } from './model-expression';
const text = (max: number) => z.string().trim().min(1).max(max);
const id = z.string().regex(/^[a-z][a-z0-9_]{0,23}$/).refine(value => !reservedModelIds.has(value), '变量名是保留字');
const number = z.number().min(-1e6).max(1e6);
export const InteractiveModelShape = z.object({
  type: z.literal('interactive-model'),
  duration: z.number().int().min(2).max(100),
  stepLabel: text(20),
  rules: text(600),
  assumptions: text(600),
  evidence: z.object({ quote: text(160), sourceId: text(100) }).strict(),
  controls: z.array(z.object({ id, label: text(40), unit: z.string().max(20), min: number, max: number, step: z.number().positive().max(1e6), value: number }).strict()).min(1).max(3),
  stocks: z.array(z.object({ id, label: text(40), unit: z.string().max(20), initial: text(240), next: text(240) }).strict()).min(1).max(3),
}).strict();
export type InteractiveModel = z.infer<typeof InteractiveModelShape>;
export const InteractiveModelSchema = InteractiveModelShape.superRefine((model, ctx) => {
  const ids = [...model.controls, ...model.stocks].map(item => item.id);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: '参数和变化量的标识不能重复' });
  for (const [i, control] of model.controls.entries()) {
    if (control.min >= control.max || control.value < control.min || control.value > control.max || control.step > control.max - control.min || (control.max - control.min) / control.step > 10000) {
      ctx.addIssue({ code: 'custom', path: ['controls', i], message: '请核对参数的范围、默认值和步长（最多 10000 档）' });
    }
  }
  for (const [i, stock] of model.stocks.entries()) {
    for (const key of ['initial', 'next'] as const) {
      try { compileExpression(stock[key], new Set(key === 'initial' ? model.controls.map(c => c.id) : [...ids, 't'])); }
      catch (error) { ctx.addIssue({ code: 'custom', path: ['stocks', i, key], message: error instanceof Error ? error.message : '公式无效' }); }
    }
  }
});

export function defaultControls(model: InteractiveModel): Record<string, number> {
  return Object.fromEntries(model.controls.map(control => [control.id, control.value]));
}
export type ModelRun = { frames: Record<string, number>[]; error: string | null };
export function simulateModel(model: InteractiveModel, controls = defaultControls(model)): ModelRun {
  const frames: Record<string, number>[] = [];
  try {
    const parsed = InteractiveModelSchema.parse(model);
    const parameters: Record<string, number> = {};
    for (const control of parsed.controls) {
      const value = controls[control.id];
      if (!Number.isFinite(value) || value < control.min || value > control.max) throw new Error(`${control.label} 超出允许范围`);
      parameters[control.id] = value;
    }
    const parameterIds = new Set(parsed.controls.map(c => c.id));
    const allIds = new Set([...parameterIds, ...parsed.stocks.map(s => s.id), 't']);
    const next = parsed.stocks.map(s => compileExpression(s.next, allIds));
    frames.push(Object.fromEntries(parsed.stocks.map(s => [s.id, compileExpression(s.initial, parameterIds)(parameters)])));
    for (let t = 0; t < parsed.duration; t++) {
      const current = { ...parameters, ...frames[t], t };
      // Simultaneous update: a stock never reads another stock's new value.
      frames.push(Object.fromEntries(parsed.stocks.map((s, i) => [s.id, next[i](current)])));
    }
    return { frames, error: null };
  } catch (error) {
    return { frames, error: error instanceof Error ? error.message : '模型计算失败' };
  }
}
