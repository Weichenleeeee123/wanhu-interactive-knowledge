import { examples } from '../src/lib/examples';

export const queueModel = {
  type: 'interactive-model' as const,
  duration: 20,
  stepLabel: '分钟',
  rules: '每分钟先到达，再处理；积压不小于零。',
  assumptions: '教学假设：每分钟到达与处理量固定，初始积压为零；不模拟随机波动。',
  evidence: { quote: '到达速度超过处理速度时，任务会积压。', sourceId: 'material' },
  controls: [
    { id: 'arrival', label: '每分钟到达', unit: '件', min: 0, max: 20, step: 1, value: 8 },
    { id: 'capacity', label: '每分钟处理', unit: '件', min: 0, max: 20, step: 1, value: 6 },
  ],
  stocks: [{ id: 'queue', label: '等待处理', unit: '件', initial: '0', next: 'max(0, queue + arrival - capacity)' }],
};
export const queueLesson = { ...examples['monty-hall'], title: '队伍为什么越来越长？', origin: 'ai' as const, sources: [], sourceIds: [], experiment: queueModel };
