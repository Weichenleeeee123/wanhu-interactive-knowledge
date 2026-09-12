import { expect, it } from "vitest";
import { readDraft, saveDraft } from "../src/lib/drafts";
import { examples } from "../src/lib/examples";
it("restores a valid edited draft and rejects corrupt browser storage", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  const lesson = { ...examples["gradient-descent"], title: "我的知识作品" };
  saveDraft(storage, lesson);
  expect(readDraft(storage)?.lesson).toEqual(lesson);
  for (const key of values.keys()) values.set(key, "broken");
  expect(readDraft(storage)).toBeNull();
});
it("preserves the saved version when an invalid edit is submitted", () => {
  let value: string | null = null;
  const storage = {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
  };
  saveDraft(storage, examples["monty-hall"]);
  expect(() =>
    saveDraft(storage, { ...examples["monty-hall"], title: "" }),
  ).toThrow();
  expect(readDraft(storage)?.lesson.title).toBe(examples["monty-hall"].title);
});
