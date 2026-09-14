import { z } from "zod";
import { InteractiveModelSchema } from './interactive-model';

const text = (max: number) =>
  z.string().trim().min(1, "请填写内容").max(max, `最多 ${max} 个字符`);
export const SafeUrlSchema = z
  .string()
  .max(2048)
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  }, "请使用有效的 http 或 https 链接");
export const SourceSchema = z
  .object({
    id: text(100),
    title: text(200),
    author: z.string().trim().max(80),
    url: SafeUrlSchema,
    excerpt: z.string().max(1200),
    provenance: z.enum(["zhihu-knowledge", "zhihu-search", "user"]).optional(),
    contentScope: z
      .enum(["official-body", "search-excerpt", "link-only"])
      .optional(),
  })
  .strict();
export type Source = z.infer<typeof SourceSchema>;
export const SourceMaterialsSchema = z
  .array(
    z.object({ sourceId: text(100), text: z.string().max(20000) }).strict(),
  )
  .max(3)
  .superRefine((items, ctx) => {
    if (items.reduce((sum, item) => sum + item.text.length, 0) > 20000)
      ctx.addIssue({ code: "custom", message: "来源正文合计最多 20,000 字符" });
    if (new Set(items.map((item) => item.sourceId)).size !== items.length)
      ctx.addIssue({ code: "custom", message: "来源正文标识不能重复" });
  });
export const ReadingCardSchema = z
  .object({
    concept: text(80),
    explanation: text(500),
    question: text(300),
    options: z
      .array(z.object({ label: text(180), feedback: text(360) }).strict())
      .length(3),
    correctIndex: z.number().int().min(0).max(2),
    evidence: z.object({ quote: text(160), sourceId: text(100) }).strict(),
  })
  .strict();
export const ArticleExplorationSchema = z
  .object({
    type: z.literal("article-exploration"),
    cards: z.array(ReadingCardSchema).min(2).max(4),
  })
  .strict();
export const ExperimentSchema = z.discriminatedUnion("type", [
  InteractiveModelSchema,
  ArticleExplorationSchema,
  z
    .object({
      type: z.literal("gradient-descent"),
      initialX: z.number().min(-10).max(10),
      learningRate: z
        .number()
        .min(0.02)
        .max(1.2)
        .multipleOf(0.01, "学习率最多保留两位小数"),
    })
    .strict(),
  z
    .object({
      type: z.literal("monty-hall"),
      trials: z.union([z.literal(100), z.literal(1000)]),
    })
    .strict(),
]);
export type Experiment = z.infer<typeof ExperimentSchema>;
export type ExperimentType = Experiment["type"];
export const LessonSchema = z
  .object({
    version: z.literal(1),
    title: text(80),
    intro: text(800),
    goal: text(200),
    prediction: text(800),
    observation: text(800),
    explanation: text(800),
    challenge: text(800),
    origin: z.enum(["example", "ai", "manual"]),
    experiment: ExperimentSchema,
    sources: z.array(SourceSchema).max(5),
    sourceIds: z.array(text(100)).max(5),
  })
  .strict()
  .superRefine((lesson, ctx) => {
    const ids = new Set(lesson.sources.map((s) => s.id));
    if (ids.size !== lesson.sources.length)
      ctx.addIssue({
        code: "custom",
        path: ["sources"],
        message: "来源标识不能重复",
      });
    if (
      lesson.sourceIds.some((id) => !ids.has(id)) ||
      new Set(lesson.sourceIds).size !== lesson.sourceIds.length
    )
      ctx.addIssue({
        code: "custom",
        path: ["sourceIds"],
        message: "讲解引用了不存在或重复的来源",
      });
    if (lesson.experiment.type === "article-exploration") {
      for (const [index, card] of lesson.experiment.cards.entries()) {
        if (
          card.evidence.sourceId !== "material" &&
          !ids.has(card.evidence.sourceId)
        )
          ctx.addIssue({
            code: "custom",
            path: ["experiment", "cards", index, "evidence", "sourceId"],
            message: "原句引用了不存在的来源",
          });
      }
    }
    if (lesson.experiment.type === 'interactive-model' && lesson.experiment.evidence.sourceId !== 'material' && !ids.has(lesson.experiment.evidence.sourceId))
      ctx.addIssue({ code: 'custom', path: ['experiment', 'evidence', 'sourceId'], message: '模型原句引用了不存在的来源' });
  });
export type Lesson = z.infer<typeof LessonSchema>;
export function lessonError(value: unknown): string | null {
  const parsed = LessonSchema.safeParse(value);
  return parsed.success
    ? null
    : parsed.error.issues.map((i) => i.message).join("；");
}
export const experimentNames: Record<ExperimentType, string> = {
  'interactive-model': '可调参数模拟器',
  "article-exploration": "原文互动阅读",
  "gradient-descent": "梯度下降",
  "monty-hall": "三门问题",
};
