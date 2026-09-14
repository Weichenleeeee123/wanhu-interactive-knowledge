import { packetAnimation, researchPath } from '../visual-examples';
export function experiencePrompt() {
  return [
    '【互动形式选择：不要把所有材料变成问答或数字曲线】先判断材料需要读者做什么，再选择一种 experiment。',
    '不可因为主题不是数学而拒绝。非数值内容优先设计分镜或分支。专用梯度下降约束：initialX 为 -10 至 10；learningRate 为 0.02 至 1.2，步长 0.01。monty-hall 的 trials 只能是100或1000。',
    '首次生成保持轻巧：分镜通常3个图形、3到4帧，流程通常4到6个节点。caption与detail各1句，不重复解释。只生成理解核心机制所需的内容，避免大型场景导致等待过长。',
    'scene-animation：空间结构、传递、因果机制、步骤演化、时间轴、前后变化，使用可播放的 SVG 分镜。模型自行设计图形、位置与各阶段状态。branching-path：条件分支、行动路径、决策权衡，使用可返回比较的流程；选项是改变条件/采取行动，不是三选一考试，不设正确答案。interactive-model：原文具有可信的数量关系时才建立安全公式模型，不得把情感、写作质量或社会观点硬编成分数。gradient-descent 和 monty-hall 保留专用交互。article-exploration 仅在明确要求测验/练习题时使用，不作为普通文章的默认形式。无法忠实设计任何演示时返回 unsupported 和具体缺失信息。',
    'scene-animation 与 branching-path 必须写 rationale（选择理由≤240字）、assumptions（简化与原文边界≤600字）、evidence（quote≤160字，逐字来自 material 或来源 excerpt；sourceId=material 或来源id）。分镜和路径的解释须基于材料，新增情境明确是教学举例；这些类型不是数值模拟。不要复制示例主题。',
    'SVG 格式：objects 1–8个，每项{id,shape,label,color,detail}。id 英文小写开头，最多24字符，可含数字、下划线、连字符；shape=circle|rect|arrow；color=blue|orange|green|purple|gray；label≤16字，detail≤300字。frames 2–8个，每项{title≤40字,caption≤400字,poses}。每帧 poses 恰好包含所有 objects 的 id（隐藏设opacity=0）。pose={id,x,y,width,height,opacity,rotation}，坐标画布640×340：x=50..590,y=50..280,width=8..150,height=8..90,opacity=0..1,rotation=-360..360。图形间留空，不要标签重叠；同一图形跨帧移动/变形/显隐，不能仅翻页换文字。SVG标签由应用绘制，不要返回HTML、SVG源码或脚本。',
    '流程格式：start 为起点id；nodes 3–10个，每项{id,title≤24字,body≤500字,choices:[{label≤60字,target}]}，choices 0–3个，空数组表示结束；至少一个节点有2条以上路径。所有target必须存在，全部节点从起点可到达，每个节点都能走到某个结束节点。不要孤立节点、不要把相同结果包装成不同选项。',
    `SVG分镜结构示例（只展示experiment，仍需完整Lesson字段）：${JSON.stringify({...packetAnimation,objects:packetAnimation.objects.slice(0,4),frames:packetAnimation.frames.slice(0,3).map(f=>({...f,poses:f.poses.slice(0,4)}))})}`,
    `分支流程结构示例：${JSON.stringify(researchPath)}`,
    'interactive-model：duration整数2..100,stepLabel≤20字,rules与assumptions各≤600字,evidence；controls 1–3个{id,label≤40字,unit≤20字,min,max,step,value}，min<max，value在范围内，最多10000档；stocks 1–3个{id,label,unit,initial,next}。公式≤240字符，仅数字、变量、小括号、+ - * / ^ 和 min(a,b),max(a,b),abs(a),sqrt(a),exp(a),log(a)。initial只引用参数；next引用参数、所有变化量的上一步值与从0开始的t，同步更新。标识小写字母开头，最多24字符，不能重名，t和函数名保留。所有数字教学假设必须说明，不保证真实预测。',
    `数值结构示例：${JSON.stringify({ type:'interactive-model',duration:20,stepLabel:'分钟',rules:'每步积压增加到达量并减去处理量，不小于零。',assumptions:'固定速率的教学简化，不是实际观测。',evidence:{sourceId:'material',quote:'从材料摘取原句'},controls:[{id:'arrival',label:'每分钟到达',unit:'件',min:0,max:20,step:1,value:8},{id:'capacity',label:'每分钟处理',unit:'件',min:0,max:20,step:1,value:6}],stocks:[{id:'queue',label:'积压',unit:'件',initial:'0',next:'max(0,queue+arrival-capacity)'}] })}`,
  ].join('\n');
}
