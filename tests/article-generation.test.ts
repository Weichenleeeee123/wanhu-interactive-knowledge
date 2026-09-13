import { describe, it, expect, vi } from "vitest";
import {
  generateLesson,
  type GenerationProvider,
} from "../src/lib/server/generate";
import { LessonSchema } from "../src/lib/lesson";
import {
  createWork,
  emptyMaterial,
  saveWork,
  readWork,
} from "../src/lib/works";
import { articleLesson, articleSource, articleText } from "./article-fixture";
const input = {
  mode: "learn" as const,
  material: articleText,
  question: "如何开始一项大任务？",
  sources: [articleSource],
  standardModel: true,
};
describe("article reading generation", () => {
  it("accepts general article scenarios with exact quotes and restores imported attribution even if omitted by model", async () => {
    const provider = vi
      .fn<GenerationProvider>()
      .mockResolvedValue(
        JSON.stringify({ ...articleLesson, sources: [], sourceIds: [] }),
      );
    const result = await generateLesson(input, { provider });
    expect(result).toMatchObject({
      lesson: {
        experiment: { type: "article-exploration" },
        sources: [articleSource],
      },
    });
    expect(provider.mock.calls[0][0].prompt).toContain(
      "不可因为主题不是数学而拒绝",
    );
  });
  it("repairs an invented quote once and accepts only quotes in the supplied material", async () => {
    const wrong = structuredClone(articleLesson);
    if (wrong.experiment.type !== "article-exploration")
      throw new Error("fixture");
    wrong.experiment.cards[0].evidence.quote =
      "不存在的专家说每天十分钟就一定能成功。";
    const provider = vi
      .fn<GenerationProvider>()
      .mockResolvedValueOnce(JSON.stringify(wrong))
      .mockResolvedValueOnce(JSON.stringify(articleLesson));
    expect(await generateLesson(input, { provider })).toMatchObject({
      lesson: articleLesson,
    });
    expect(provider).toHaveBeenCalledTimes(2);
    expect(provider.mock.calls[1][0].prompt).toContain("原句未能");
  });
  it("rejects a real quote falsely attributed to another source", async () => {
    const wrongSource = {
      ...articleSource,
      excerpt: "另一篇内容，没有这些观点。",
    };
    const provider = vi
      .fn<GenerationProvider>()
      .mockResolvedValue(JSON.stringify(articleLesson));
    await expect(
      generateLesson({ ...input, sources: [wrongSource] }, { provider }),
    ).rejects.toMatchObject({ code: "INVALID_PROVIDER_OUTPUT" });
    expect(provider).toHaveBeenCalledTimes(2);
  });
  it("requires every source reference to exist and keeps quotes bounded", () => {
    const invalid = structuredClone(articleLesson);
    if (invalid.experiment.type !== "article-exploration")
      throw new Error("fixture");
    invalid.experiment.cards[0].evidence.sourceId = "invented";
    expect(LessonSchema.safeParse(invalid).success).toBe(false);
    invalid.experiment.cards[0].evidence = {
      sourceId: "material",
      quote: "长".repeat(161),
    };
    expect(LessonSchema.safeParse(invalid).success).toBe(false);
  });
  it("retains author attribution for quotes beyond the first 1200 characters", async () => {
    const source = { ...articleSource, excerpt: "前".repeat(1200) };
    const raw = structuredClone(articleLesson);
    if (raw.experiment.type !== "article-exploration")
      throw new Error("fixture");
    raw.experiment.cards[0].evidence.sourceId = "material";
    const provider = vi
      .fn<GenerationProvider>()
      .mockResolvedValue(JSON.stringify(raw));
    const result = await generateLesson(
      {
        ...input,
        material: source.excerpt + "\n" + articleText,
        sources: [source],
        sourceMaterials: [
          { sourceId: source.id, text: source.excerpt + "\n" + articleText },
        ],
      },
      { provider },
    );
    expect(result).toMatchObject({
      lesson: {
        sources: [source],
        experiment: { cards: [{ evidence: { sourceId: source.id } }, {}] },
      },
    });
  });
  it("does not accept whitespace insertion that changes an original word", async () => {
    const lesson = structuredClone(articleLesson);
    if (lesson.experiment.type !== "article-exploration")
      throw new Error("fixture");
    lesson.experiment.cards[0].evidence = {
      sourceId: "material",
      quote: "now here",
    };
    const provider = vi
      .fn<GenerationProvider>()
      .mockResolvedValue(JSON.stringify(lesson));
    await expect(
      generateLesson(
        {
          ...input,
          material: articleText + " The answer is nowhere to be found.",
        },
        { provider },
      ),
    ).rejects.toMatchObject({ code: "INVALID_PROVIDER_OUTPUT" });
  });
  it("excludes deleted imported paragraphs from the prompt and citation validation", async () => {
    const remaining = articleText.split("\n\n")[0];
    const removed = articleText.split("\n\n")[1];
    const provider = vi
      .fn<GenerationProvider>()
      .mockResolvedValue(JSON.stringify(articleLesson));
    await expect(
      generateLesson(
        {
          ...input,
          material: remaining,
          sourceMaterials: [{ sourceId: articleSource.id, text: articleText }],
        },
        { provider },
      ),
    ).rejects.toMatchObject({ code: "INVALID_PROVIDER_OUTPUT" });
    expect(provider.mock.calls[0][0].prompt).not.toContain(removed);
  });
  it("persists partially edited cards while strict reader validation rejects unfinished fields", () => {
    const lesson = structuredClone(articleLesson);
    if (lesson.experiment.type !== "article-exploration")
      throw new Error("fixture");
    lesson.experiment.cards[0].concept = "";
    lesson.experiment.cards[0].evidence.quote = "";
    const records = new Map<string, string>();
    const storage = {
      get length() {
        return records.size;
      },
      getItem: (key: string) => records.get(key) ?? null,
      setItem: (key: string, value: string) => {
        records.set(key, value);
      },
      key: (index: number) => [...records.keys()][index] ?? null,
    };
    const work = createWork({
      lesson,
      material: {
        ...emptyMaterial(),
        material: articleText,
        sources: [articleSource],
      },
    });
    saveWork(storage, work);
    expect(readWork(storage, work.id)?.lesson).toEqual(lesson);
    expect(LessonSchema.safeParse(lesson).success).toBe(false);
  });
});
