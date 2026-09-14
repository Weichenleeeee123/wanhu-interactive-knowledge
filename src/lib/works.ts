import { z } from "zod";
import {
  ArticleExplorationSchema,
  ReadingCardSchema,
  LessonSchema,
  SourceSchema,
  SourceMaterialsSchema,
  type Lesson,
} from "./lesson";
import { readDraft } from "./drafts";
import { InteractiveModelShape } from './interactive-model';
import { SceneAnimationSchema, BranchingPathSchema } from './visual-experiences';

const PREFIX = "wanhu.work.v1.";
const RECOVERY_PREFIX = "wanhu.recovery.v1.";
let writerId: string | undefined;
const MAX_RECORD = 1024 * 1024;
type Storage = Pick<
  globalThis.Storage,
  "getItem" | "setItem" | "key" | "length"
>;
export const MaterialSchema = z
  .object({
    question: z.string().max(200),
    query: z.string().max(200),
    material: z.string().max(200000),
    sources: SourceSchema.array().max(3),
    sourceMaterials: SourceMaterialsSchema.optional(),
    sourceUrl: z.string().max(2048),
    sourceTitle: z.string().max(200),
    sourceAuthor: z.string().max(80),
    consent: z.boolean(),
  })
  .strict();
export type Material = z.infer<typeof MaterialSchema>;
export const emptyMaterial = (): Material => ({
  question: "",
  query: "",
  material: "",
  sources: [],
  sourceUrl: "",
  sourceTitle: "",
  sourceAuthor: "",
  consent: false,
});

// An unfinished draft may contain empty fields or out-of-range controls. The stricter
// LessonSchema is still required for preview, exports intended for readers, and sharing.
const DraftLessonSchema = z
  .object({
    ...LessonSchema.shape,
    title: z.string().max(80),
    intro: z.string().max(800),
    goal: z.string().max(200),
    prediction: z.string().max(800),
    observation: z.string().max(800),
    explanation: z.string().max(800),
    challenge: z.string().max(800),
    experiment: z.discriminatedUnion("type", [
      InteractiveModelShape,
      SceneAnimationSchema.safeExtend({
        rationale: z.string().max(240), assumptions: z.string().max(600),
        frames: SceneAnimationSchema.shape.frames.element.extend({title:z.string().max(40),caption:z.string().max(400)}).array().min(2).max(8),
      }),
      BranchingPathSchema.safeExtend({
        rationale: z.string().max(240), assumptions: z.string().max(600),
        nodes: BranchingPathSchema.shape.nodes.element.extend({title:z.string().max(24),body:z.string().max(500)}).array().min(3).max(10),
      }),
      ArticleExplorationSchema.extend({
        cards: ReadingCardSchema.extend({
          concept: z.string().max(80),
          explanation: z.string().max(500),
          question: z.string().max(300),
          options: z
            .array(
              z
                .object({
                  label: z.string().max(180),
                  feedback: z.string().max(360),
                })
                .strict(),
            )
            .length(3),
          evidence: z
            .object({
              quote: z.string().max(160),
              sourceId: z.string().max(100),
            })
            .strict(),
        })
          .array()
          .min(2)
          .max(4),
      }),
      z
        .object({
          type: z.literal("gradient-descent"),
          initialX: z.number(),
          learningRate: z.number(),
        })
        .strict(),
      z
        .object({
          type: z.literal("monty-hall"),
          trials: z.union([z.literal(100), z.literal(1000)]),
        })
        .strict(),
    ]),
  })
  .strict();
const WorkSchema = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9-]{1,100}$/),
    revision: z.number().int().min(0),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    mode: z.enum(["teach", "learn"]),
    material: MaterialSchema,
    lesson: DraftLessonSchema.nullable(),
  })
  .strict();
export type Work = z.infer<typeof WorkSchema>;
export function createWork(
  input: Partial<Pick<Work, "lesson" | "material" | "mode">> = {},
): Work {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    revision: 0,
    createdAt: now,
    updatedAt: now,
    mode: input.mode ?? "teach",
    material: input.material ?? emptyMaterial(),
    lesson: input.lesson ?? null,
  };
}
function parseRecord(raw: string): Work {
  if (raw.length > MAX_RECORD) throw new Error("作品数据过大");
  return WorkSchema.parse(JSON.parse(raw));
}
export function readWork(storage: Storage, id: string): Work | null {
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(id)) return null;
  const raw = storage.getItem(PREFIX + id);
  if (!raw) return null;
  try {
    const work = parseRecord(raw);
    return work.id === id ? work : null;
  } catch {
    return null;
  }
}
export function listWorks(storage: Storage): {
  works: Work[];
  unreadable: number;
} {
  const works: Work[] = [];
  let unreadable = 0;
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key?.startsWith(PREFIX)) continue;
    const work = readWork(storage, key.slice(PREFIX.length));
    if (work) works.push(work);
    else unreadable++;
  }
  return {
    works: works.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    unreadable,
  };
}
function currentWriter() {
  if (writerId) return writerId;
  // Browser "duplicate tab" can clone sessionStorage, so each document gets its own writer.
  writerId = crypto.randomUUID();
  return writerId;
}
const RecoverySchema = z
  .object({ id: z.string().uuid(), work: WorkSchema })
  .strict();
export type Recovery = z.infer<typeof RecoverySchema> & { temporary?: true };
const pendingRecoveries = new Map<string, Recovery>();
let pendingProtectionInstalled = false;
export function rememberPending(work: Work) {
  const existing = pendingRecoveries.get(work.id);
  pendingRecoveries.set(work.id, {
    id: existing?.id ?? crypto.randomUUID(),
    work: { ...work, updatedAt: new Date().toISOString() },
    temporary: true,
  });
  if (!pendingProtectionInstalled && typeof window !== "undefined") {
    pendingProtectionInstalled = true;
    window.addEventListener("beforeunload", (event) => {
      if (pendingRecoveries.size) {
        event.preventDefault();
        event.returnValue = "";
      }
    });
  }
}
export function readPendingRecoveries() {
  return [...pendingRecoveries.values()];
}
export function readRecoveries(storage: Storage): Recovery[] {
  const recoveries: Recovery[] = readPendingRecoveries();
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key?.startsWith(RECOVERY_PREFIX)) continue;
    try {
      const raw = storage.getItem(key);
      if (raw && raw.length <= MAX_RECORD) {
        const parsed = RecoverySchema.safeParse(JSON.parse(raw));
        if (parsed.success) recoveries.push(parsed.data);
      }
    } catch {
      /* Unreadable recovery records must never prevent opening healthy works. */
    }
  }
  return recoveries.sort((a, b) =>
    b.work.updatedAt.localeCompare(a.work.updatedAt),
  );
}
export function availableRecoveries(storage: Storage) {
  const works = listWorks(storage).works;
  const contents = (work: Work) =>
    JSON.stringify({
      lesson: work.lesson,
      material: work.material,
      mode: work.mode,
    });
  const known = new Set(works.map(contents));
  return readRecoveries(storage).filter((recovery) => {
    const content = contents(recovery.work);
    if (known.has(content)) return false;
    known.add(content);
    return true;
  });
}
function workContent(work: Work) {
  return JSON.stringify({
    lesson: work.lesson,
    material: work.material,
    mode: work.mode,
  });
}
export function saveWork(
  storage: Storage,
  work: Work,
  writer = currentWriter(),
): Work {
  const valid = WorkSchema.parse(work);
  const key = PREFIX + valid.id;
  const next = {
    ...valid,
    revision: valid.revision + 1,
    updatedAt: new Date().toISOString(),
  };
  const raw = JSON.stringify(next);
  if (raw.length > MAX_RECORD) throw new Error("作品数据过大，请先备份素材。");
  // A per-document recovery slot preserves each writer's last content even when two tabs
  // interleave the revision check and write. It is updated in place, not per keystroke.
  const recoveryKey = RECOVERY_PREFIX + valid.id + "." + writer;
  let recoveryId = crypto.randomUUID();
  try {
    const old = storage.getItem(recoveryKey);
    if (old)
      recoveryId = RecoverySchema.parse(JSON.parse(old))
        .id as typeof recoveryId;
  } catch {}
  storage.setItem(recoveryKey, JSON.stringify({ id: recoveryId, work: next }));
  // Preserve the attempted content before rejecting a stale edit. Navigating away
  // can then recover that edit without ever overwriting the newer primary record.
  const currentRaw = storage.getItem(key);
  if (currentRaw) {
    let current: Work;
    try {
      current = parseRecord(currentRaw);
    } catch {
      throw new Error("已有数据无法读取，请另存副本以保留当前修改。");
    }
    if (current.id !== valid.id || current.revision !== valid.revision)
      throw new Error("其他标签页已修改这份作品。请另存副本，保留两份修改。");
  } else if (valid.revision !== 0)
    throw new Error("本机存储已发生变化，请另存副本保留当前修改。");
  storage.setItem(key, raw);
  pendingRecoveries.delete(work.id);
  for (const [id, pending] of pendingRecoveries) {
    if (workContent(pending.work) === workContent(next))
      pendingRecoveries.delete(id);
  }
  return next;
}
export function migrateDraft(storage: Storage) {
  if (storage.getItem(PREFIX + "legacy-draft")) return;
  const old = readDraft(storage);
  if (old)
    saveWork(storage, {
      ...createWork({ lesson: old.lesson }),
      id: "legacy-draft",
    });
}
export function workTitle(work: Work) {
  return (
    work.lesson?.title.trim() ||
    work.material.question.trim() ||
    "尚未命名的作品"
  );
}
export function workStatus(work: Work) {
  return !work.lesson
    ? "整理素材中"
    : LessonSchema.safeParse(work.lesson).success
      ? "可阅读 · 可分享"
      : "讲解待完善";
}
export function backupWork(work: Work) {
  return JSON.stringify(
    { format: "wanhu-workspace-v1", work: WorkSchema.parse(work) },
    null,
    2,
  );
}
export function parseWorkBackup(raw: string): Work {
  if (raw.length > MAX_RECORD) throw new Error("备份文件过大，最多 1 MiB");
  const parsed = z
    .object({ format: z.literal("wanhu-workspace-v1"), work: WorkSchema })
    .strict()
    .parse(JSON.parse(raw));
  return createWork({
    mode: parsed.work.mode,
    material: parsed.work.material,
    lesson: parsed.work.lesson,
  });
}
export function duplicateWork(work: Work): Work {
  const suffix = " · 副本";
  return createWork({
    mode: work.mode,
    material: structuredClone(work.material),
    lesson: work.lesson
      ? ({
          ...structuredClone(work.lesson),
          title:
            (work.lesson.title || "未命名作品").slice(0, 80 - suffix.length) +
            suffix,
        } as Lesson)
      : null,
  });
}
