import { expect, it } from "vitest";
import { examples } from "../src/lib/examples";
import {
  newHistory,
  recordEdit,
  undoEdit,
  redoEdit,
} from "../src/lib/edit-history";
it("groups continuous typing and restores the whole previous title", () => {
  const lesson = examples["monty-hall"];
  let history = newHistory(lesson);
  history = recordEdit(history, { ...lesson, title: "第" }, "title", 100);
  history = recordEdit(
    history,
    { ...lesson, title: "第二个标题" },
    "title",
    200,
  );
  expect(undoEdit(history).present?.title).toBe(lesson.title);
  expect(redoEdit(undoEdit(history)).present?.title).toBe("第二个标题");
});
it("new edits after undo discard redo without losing the saved history", () => {
  const lesson = examples["monty-hall"];
  let h = recordEdit(newHistory(lesson), { ...lesson, title: "A" });
  h = recordEdit(undoEdit(h), { ...lesson, title: "B" });
  expect(h.future).toHaveLength(0);
  expect(undoEdit(h).present).toEqual(lesson);
});
