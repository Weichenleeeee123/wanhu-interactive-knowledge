import { LessonSchema, type Source } from "../src/lib/lesson";
export const articleText =
  "把大任务拆成可以在十分钟内开始的小步骤。\n\n完成一步后记录进展，再决定下一步。";
export const articleSource: Source = {
  id: "knowledge-123",
  title: "如何开始一个大任务",
  author: "测试作者",
  url: "https://api.zhihu.com/km-indep-home/hackathon/v2/knowledge/123",
  excerpt: articleText,
  provenance: "zhihu-knowledge",
  contentScope: "official-body",
};
export const articleLesson = LessonSchema.parse({
  version: 1,
  origin: "ai",
  title: "大任务，从哪里开始？",
  intro: "面对一整篇任务清单，先判断下一步。",
  goal: "理解文章中拆分任务与记录进展的方法。",
  prediction: "读之前，你觉得自己理解了多少？",
  observation: "选择具体情境中的做法，再对照材料原句。",
  explanation: "本文提供的是一种开始任务的方法，需要结合实际情境选择。",
  challenge: "给自己写下一个可以开始的小步骤。",
  sources: [articleSource],
  sourceIds: [articleSource.id],
  experiment: {
    type: "article-exploration",
    cards: [
      {
        concept: "拆分任务",
        question: "准备一份长报告，根据本文应该先怎么做？",
        explanation: "把模糊的任务换成可开始的步骤。",
        options: [
          {
            label: "先列出三个要点",
            feedback: "这给了你一个可以开始的小步骤。",
          },
          {
            label: "等有整天空闲再开始",
            feedback: "这仍然把任务保留成一个整体。",
          },
          { label: "同时打开所有资料", feedback: "这没有明确当前要做的步骤。" },
        ],
        correctIndex: 0,
        evidence: {
          sourceId: articleSource.id,
          quote: "把大任务拆成可以在十分钟内开始的小步骤。",
        },
      },
      {
        concept: "记录进展",
        question: "完成一个小步骤后，根据本文应做什么？",
        explanation: "记录已完成的内容，让下一步更具体。",
        options: [
          {
            label: "记录进展并确定下一步",
            feedback: "这是本文所建议的衔接方式。",
          },
          { label: "不回顾就重新开始", feedback: "这样看不到已完成的部分。" },
          {
            label: "一次增加十个新目标",
            feedback: "文章并没有建议增加更多目标。",
          },
        ],
        correctIndex: 0,
        evidence: {
          sourceId: articleSource.id,
          quote: "完成一步后记录进展，再决定下一步。",
        },
      },
    ],
  },
});
