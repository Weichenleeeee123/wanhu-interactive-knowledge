import type { Lesson } from "./lesson";
export type EditHistory = {
  past: (Lesson | null)[];
  present: Lesson | null;
  future: (Lesson | null)[];
  group: string;
  at: number;
};
export function newHistory(lesson: Lesson | null): EditHistory {
  return { past: [], present: lesson, future: [], group: "", at: 0 };
}
export function recordEdit(
  history: EditHistory,
  lesson: Lesson,
  group = "",
  now = Date.now(),
): EditHistory {
  if (JSON.stringify(history.present) === JSON.stringify(lesson))
    return history;
  const grouped =
    group &&
    group === history.group &&
    now - history.at < 1000 &&
    !history.future.length;
  return {
    past: grouped
      ? history.past
      : [...history.past, history.present].slice(-40),
    present: lesson,
    future: [],
    group,
    at: now,
  };
}
export function undoEdit(history: EditHistory): EditHistory {
  if (!history.past.length) return history;
  return {
    past: history.past.slice(0, -1),
    present: history.past.at(-1)!,
    future: [history.present, ...history.future],
    group: "",
    at: 0,
  };
}
export function redoEdit(history: EditHistory): EditHistory {
  if (!history.future.length) return history;
  return {
    past: [...history.past, history.present],
    present: history.future[0],
    future: history.future.slice(1),
    group: "",
    at: 0,
  };
}
