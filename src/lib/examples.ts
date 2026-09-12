import { LessonSchema, type Lesson, type ExperimentType } from "./lesson";

export const examples: Record<ExperimentType, Lesson> = {
  "gradient-descent": LessonSchema.parse({
    version: 1,
    origin: "example",
    title: "步子越大，下山越快吗？",
    intro:
      "“沿着下坡方向走”听起来很简单。但步子一大，为什么反而离谷底越来越远？把学习率交到你手里，亲自走几步。",
    goal: "通过改变学习率，理解收敛、震荡和发散的区别。",
    prediction:
      "从 x = 8 出发。如果把学习率从 0.20 调到 1.00，小球会更快到达谷底吗？先想一想，再动手试。",
    observation:
      "先用 0.20 单步前进，再试试 0.02、1.00 和 1.10。留意小球的位置和损失值：每一步都朝下坡方向计算，但步长过大可能跨过整个山谷。",
    explanation:
      "这个实验采用简化教学模型 f(x) = x²，每一步按 x ← x − η·2x 更新。非零初值下，0 < η < 1 时逐渐靠近 0；η = 0.5 时一步到达 0；η = 1 时在两侧等幅震荡；η > 1 时越走越远。初值为 0 时不会移动。这些数值边界属于本模型，不适用于所有损失函数。",
    challenge:
      "别只记住“学习率不能太大”。用一次实际计算，检查自己是否理解下一步从哪里来。",
    experiment: { type: "gradient-descent", initialX: 8, learningRate: 0.2 },
    sources: [
      {
        id: "gradient-reference",
        title: "如何最简单、通俗地理解梯度下降算法？",
        author: "",
        url: "https://www.zhihu.com/tardis/bd/ans/2508126669",
        excerpt:
          "参考阅读入口。本页讲解由项目自行编写，实验使用 f(x) = x² 的简化教学模型。",
      },
    ],
    sourceIds: ["gradient-reference"],
  }),
  "monty-hall": LessonSchema.parse({
    version: 1,
    origin: "example",
    title: "剩下两扇门，真的各有一半机会？",
    intro:
      "你选了一扇门，主持人打开了另一扇空门。此时换门，还是坚持？先相信一次直觉，再让实验说话。",
    goal: "理解主持人知道奖品位置时，为什么换门的理论胜率是 2/3。",
    prediction:
      "三扇门，一份奖品。主持人知道奖品位置，始终打开你没有选中的一扇空门，并始终允许换门。你认为换门会提高胜率吗？",
    observation:
      "先亲自玩几轮，再运行 1000 次对照实验。两种策略使用同一批初选和奖品位置，因此可以直接比较。少量试验的频率可能偏离理论概率。",
    explanation:
      "初选中奖的概率为 1/3，初选错误的概率为 2/3。如果最初选对，坚持才会赢；如果最初选错，主持人排除另一扇空门后，换门一定赢。因此在这里的标准主持人规则下，坚持的理论胜率是 1/3，换门是 2/3。改变主持人的规则，就需要重新分析。",
    challenge:
      "把你的判断和实验结果联系起来：主持人知道奖品在哪里，是这道题的重要条件。",
    experiment: { type: "monty-hall", trials: 1000 },
    sources: [
      {
        id: "monty-reference",
        title: "三门问题，为什么概率会上升？",
        author: "",
        url: "https://www.zhihu.com/tardis/bd/ans/3088391463",
        excerpt:
          "参考阅读入口。本页按标准三门问题规则自行编写讲解，未复制原回答全文。",
      },
    ],
    sourceIds: ["monty-reference"],
  }),
};
export function getExample(type: string | null): Lesson | null {
  return type === "gradient-descent" || type === "monty-hall"
    ? structuredClone(examples[type])
    : null;
}
