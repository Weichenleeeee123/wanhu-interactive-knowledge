import { expect, it } from "vitest";
import { LessonSchema } from "../src/lib/lesson";
import { examples } from "../src/lib/examples";
it("rejects imported learning rates that disagree with the 0.01 control step", () => {
  const lesson = examples["gradient-descent"];
  expect(
    LessonSchema.safeParse({
      ...lesson,
      experiment: {
        type: "gradient-descent",
        initialX: 8,
        learningRate: 0.123456,
      },
    }).success,
  ).toBe(false);
  expect(
    LessonSchema.safeParse({
      ...lesson,
      experiment: { type: "gradient-descent", initialX: 8, learningRate: 0.12 },
    }).success,
  ).toBe(true);
});
