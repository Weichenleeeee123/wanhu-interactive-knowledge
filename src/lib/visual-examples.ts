import type { SceneAnimationData, BranchingPathData } from './visual-experiences';
export const packetAnimation: SceneAnimationData = {
  type: 'scene-animation', rationale: '用消息的位置和确认信号的反向移动，区分发送、传递与确认。',
  assumptions: '原创教学示意：只画一次成功传递，省略丢包、重传与实际网络层次；位置与速度不按真实比例。',
  evidence: { sourceId: 'material', quote: '发送方把消息交给中转节点，接收方收到消息后返回确认。' },
  objects: [
    { id: 'sender', shape: 'rect', label: '发送方', color: 'blue', detail: '发出消息。发送成功与确认收到是两个不同阶段。' },
    { id: 'relay', shape: 'rect', label: '中转节点', color: 'gray', detail: '负责转发。本图用一个节点代表中间传递过程。' },
    { id: 'receiver', shape: 'rect', label: '接收方', color: 'green', detail: '接收消息，并在本例中发送确认。' },
    { id: 'packet', shape: 'circle', label: '消息', color: 'orange', detail: '观察圆形标记的位置：它从发送方经中转节点移到接收方。' },
    { id: 'ack', shape: 'arrow', label: '确认', color: 'purple', detail: '确认沿反向传递。实际系统中确认机制由具体协议决定。' },
  ],
  frames: [
    { title: '准备发送', caption: '消息在发送方。先点一下橙色圆形，再播放，看它与确认信号如何移动。', poses: [] },
    { title: '经过中转', caption: '消息经过中转节点。此时发送方仍未收到接收确认。', poses: [] },
    { title: '接收并确认', caption: '消息抵达接收方；接收方发出反向的确认信号。', poses: [] },
    { title: '确认返回', caption: '确认经过中转节点向发送方返回。两个方向的移动代表不同的消息。', poses: [] },
    { title: '本次传递完成', caption: '确认抵达发送方。拖动进度，比较“消息抵达”与“确认返回”的时刻。', poses: [] },
  ].map((frame, i) => ({ ...frame, poses: [
    ...['sender', 'relay', 'receiver'].map((id, n) => ({ id, x: 100 + n * 220, y: 120, width: 120, height: 60, opacity: 1, rotation: 0 })),
    { id: 'packet', x: [100, 320, 540, 540, 540][i], y: 220, width: 54, height: 54, opacity: 1, rotation: 0 },
    { id: 'ack', x: [540, 540, 540, 320, 100][i], y: 270, width: 66, height: 24, opacity: i < 2 ? 0 : 1, rotation: 180 },
  ] })),
};
export const researchPath: BranchingPathData = {
  type: 'branching-path', rationale: '相同的文章选题，因证据状态不同会走向不同的写作路径。',
  assumptions: '原创流程示例，用来探索写作选择；路径没有统一评分，真实写作还需判断证据质量。',
  evidence: { sourceId: 'material', quote: '写作前先检查论点的依据：证据不足时继续查证；证据互相矛盾时明确分歧；证据一致时仍要说明适用条件。' },
  start: 'claim', nodes: [
    { id: 'claim', title: '准备写下一个观点', body: '先检查手头的材料。改变证据状态，看看文章结构需要怎样调整。', choices: [{ label: '目前只有个人经验', target: 'anecdote' }, { label: '查到了相互矛盾的解释', target: 'conflict' }, { label: '多份材料结论一致', target: 'boundary' }] },
    { id: 'anecdote', title: '区分经验与结论', body: '个人经验可以是开场，却不足以代表所有人。接下来要选择怎样表达。', choices: [{ label: '补充可核对的材料', target: 'boundary' }, { label: '明确只分享个人经历', target: 'limited' }] },
    { id: 'conflict', title: '把分歧写出来', body: '先对照定义、样本和条件，避免为了顺畅而抹掉矛盾。', choices: [{ label: '能找到解释差异的条件', target: 'boundary' }, { label: '暂时无法判断', target: 'limited' }] },
    { id: 'boundary', title: '限定观点的适用范围', body: '把前提与反例放进文章，给读者能够核对的依据。这样论点更具体，也更便于讨论。', choices: [{ label: '整理成带条件的论点', target: 'publish' }] },
    { id: 'limited', title: '保留不确定性', body: '这条路径以经验分享或开放问题结尾。明确哪些尚未验证，让评论区有可讨论的空间。', choices: [] },
    { id: 'publish', title: '形成可讨论的论证', body: '观点、依据与边界一起呈现。回到起点换一种材料状态，比较你走过的路径。', choices: [] },
  ],
};
