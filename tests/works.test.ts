import { expect, it } from "vitest";
import { examples } from "../src/lib/examples";
import {
  createWork,
  listWorks,
  readWork,
  saveWork,
  migrateDraft,
  parseWorkBackup,
  availableRecoveries,
} from "../src/lib/works";
function memory() {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    key: (i: number) => [...values.keys()][i] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}
it("keeps separate works and their source material through subsequent edits", () => {
  const storage = memory();
  let first = createWork({ lesson: examples["gradient-descent"] });
  first = saveWork(storage, {
    ...first,
    material: {
      ...first.material,
      question: "我的问题",
      material: "我的原始材料",
    },
  });
  const second = saveWork(
    storage,
    createWork({ lesson: examples["monty-hall"], mode: "learn" }),
  );
  first = saveWork(storage, {
    ...first,
    lesson: { ...first.lesson!, title: "修改后的第一篇" },
  });
  expect(listWorks(storage).works).toHaveLength(2);
  expect(readWork(storage, first.id)?.material.material).toBe("我的原始材料");
  expect(readWork(storage, second.id)?.lesson?.title).toBe(
    examples["monty-hall"].title,
  );
});
it("preserves incomplete editing without accepting it as a publishable lesson", () => {
  const storage = memory();
  const work = saveWork(
    storage,
    createWork({ lesson: { ...examples["monty-hall"], title: "" } }),
  );
  expect(readWork(storage, work.id)?.lesson?.title).toBe("");
});
it("migrates the legacy draft once without changing the original", () => {
  const storage = memory();
  const raw = JSON.stringify({
    lesson: examples["monty-hall"],
    savedAt: "2026-09-12T10:00:00.000Z",
  });
  storage.setItem("zhiwan.draft.v1", raw);
  migrateDraft(storage);
  migrateDraft(storage);
  expect(listWorks(storage).works).toHaveLength(1);
  expect(storage.getItem("zhiwan.draft.v1")).toBe(raw);
});
it("rejects stale writes and leaves the newer work untouched", () => {
  const storage = memory();
  const original = saveWork(
    storage,
    createWork({ lesson: examples["monty-hall"] }),
  );
  const newer = saveWork(storage, {
    ...original,
    lesson: { ...original.lesson!, title: "其他标签页的修改" },
  });
  expect(() =>
    saveWork(storage, {
      ...original,
      lesson: { ...original.lesson!, title: "旧状态" },
    }),
  ).toThrow("其他标签页");
  expect(readWork(storage, newer.id)?.lesson?.title).toBe("其他标签页的修改");
  expect(
    availableRecoveries(storage).some(
      (item) => item.work.lesson?.title === "旧状态",
    ),
  ).toBe(true);
});
it("reports corrupt records while retaining healthy works", () => {
  const storage = memory();
  saveWork(storage, createWork());
  storage.setItem("zhiwan.work.v1.bad", "{");
  expect(listWorks(storage).works).toHaveLength(1);
  expect(listWorks(storage).unreadable).toBe(1);
});
it("does not hide a storage failure", () => {
  const storage = memory();
  storage.setItem = () => {
    throw new Error("磁盘已满");
  };
  expect(() => saveWork(storage, createWork())).toThrow("磁盘已满");
});
it("round trips a workspace backup including unfinished materials", () => {
  const work = createWork();
  work.material.material = "还没生成的长文";
  const restored = parseWorkBackup(
    JSON.stringify({ format: "zhiwan-workspace-v1", work }),
  );
  expect(restored.material.material).toBe("还没生成的长文");
  expect(restored.id).not.toBe(work.id);
});
it("retains both writers' content when truly concurrent writes interleave", () => {
  const storage = memory();
  const original = saveWork(
    storage,
    createWork({ lesson: examples["monty-hall"] }),
    "initial",
  );
  const baseSet = storage.setItem;
  let inserted = false;
  storage.setItem = (key, value) => {
    if (key === `zhiwan.work.v1.${original.id}` && !inserted) {
      inserted = true;
      saveWork(
        storage,
        { ...original, lesson: { ...original.lesson!, title: "并发写入 B" } },
        "writer-b",
      );
    }
    baseSet(key, value);
  };
  saveWork(
    storage,
    { ...original, lesson: { ...original.lesson!, title: "并发写入 A" } },
    "writer-a",
  );
  expect(readWork(storage, original.id)?.lesson?.title).toBe("并发写入 A");
  expect(
    availableRecoveries(storage).map((item) => item.work.lesson?.title),
  ).toContain("并发写入 B");
});
it("retains recoverable content if the primary write fails after the recovery write", () => {
  const storage = memory();
  const work = createWork({ lesson: examples["monty-hall"] });
  const baseSet = storage.setItem;
  storage.setItem = (key, value) => {
    if (key.startsWith("zhiwan.work.v1.")) throw new Error("写入中断");
    baseSet(key, value);
  };
  expect(() => saveWork(storage, work)).toThrow("写入中断");
  expect(availableRecoveries(storage)[0]?.work.lesson).toEqual(work.lesson);
});
