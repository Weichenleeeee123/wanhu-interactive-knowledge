import { LessonSchema, type Lesson } from "./lesson";
const DRAFT_KEY = "wanhu.draft.v1";
type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;
export function saveDraft(storage: Storage, lesson: Lesson) {
  const valid = LessonSchema.parse(lesson);
  storage.setItem(
    DRAFT_KEY,
    JSON.stringify({ lesson: valid, savedAt: new Date().toISOString() }),
  );
}
export function readDraft(
  storage: Storage,
): { lesson: Lesson; savedAt: string } | null {
  try {
    const raw = storage.getItem(DRAFT_KEY);
    if (!raw || raw.length > 65536) return null;
    const value = JSON.parse(raw);
    const parsed = LessonSchema.safeParse(value.lesson);
    return parsed.success && typeof value.savedAt === "string"
      ? { lesson: parsed.data, savedAt: value.savedAt }
      : null;
  } catch {
    return null;
  }
}
