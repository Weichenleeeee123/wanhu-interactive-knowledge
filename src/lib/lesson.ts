import { z } from "zod";

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
  })
  .strict();
export type Source = z.infer<typeof SourceSchema>;
export const ExperimentSchema = z.discriminatedUnion("type", [
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
  });
export type Lesson = z.infer<typeof LessonSchema>;
export function lessonError(value: unknown): string | null {
  const parsed = LessonSchema.safeParse(value);
  return parsed.success
    ? null
    : parsed.error.issues.map((i) => i.message).join("；");
}
export const experimentNames: Record<ExperimentType, string> = {
  "gradient-descent": "梯度下降",
  "monty-hall": "三门问题",
};
