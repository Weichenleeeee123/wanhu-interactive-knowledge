import { describe, it, expect } from "vitest";
import { gzipSync } from "node:zlib";
import {
  gradientStep,
  gradientStatus,
  revealDoor,
  switchDoor,
  simulateMonty,
  seededRandom,
} from "../src/lib/experiments";
import { LessonSchema } from "../src/lib/lesson";
import { examples } from "../src/lib/examples";
import { encodeLesson, decodeLesson, parseLessonFile } from "../src/lib/share";

describe("gradient descent with f(x)=x²", () => {
  it("computes parameter updates and exact oscillation", () => {
    expect(gradientStep(10, 0.2)).toBe(6);
    expect(gradientStep(10, 0.5)).toBe(0);
    expect(gradientStep(gradientStep(10, 1), 1)).toBe(10);
  });
  it("keeps zero fixed and distinguishes stop conditions", () => {
    expect(gradientStep(0, 1.2)).toBe(0);
    expect(gradientStatus(0, 1)).toBe("converged");
    expect(gradientStatus(1e6, 20)).toBe("diverged");
    expect(gradientStatus(Infinity, 20)).toBe("diverged");
    expect(gradientStatus(5, 100)).toBe("limit");
    expect(gradientStatus(5, 2)).toBe("running");
  });
});
describe("Monty Hall standard host rules", () => {
  it("enumerates every initial choice and prize position", () => {
    for (let prize = 0; prize < 3; prize++)
      for (let choice = 0; choice < 3; choice++) {
        for (const random of [() => 0, () => 0.999]) {
          const host = revealDoor(prize, choice, random);
          expect([prize, choice]).not.toContain(host);
          expect(switchDoor(choice, host) === prize).toBe(choice !== prize);
        }
      }
  });
  it("uses the same trials for both strategies and can reproduce a batch", () => {
    const result = simulateMonty(1000, seededRandom(42));
    expect(result.stayWins + result.switchWins).toBe(1000);
    expect(result).toEqual(simulateMonty(1000, seededRandom(42)));
    expect(result.switchWins).toBeGreaterThan(600);
    expect(result.switchWins).toBeLessThan(730);
  });
  it("rejects impossible door indexes and invalid trial counts", () => {
    expect(() => revealDoor(3, 0)).toThrow();
    expect(() => switchDoor(0, 0)).toThrow();
    expect(() => simulateMonty(-1)).toThrow();
  });
});
describe("portable lesson boundaries", () => {
  it("validates both original examples", () => {
    for (const lesson of Object.values(examples))
      expect(LessonSchema.safeParse(lesson).success).toBe(true);
  });
  it("rejects executable URLs, invalid numeric ranges and unknown data", () => {
    const lesson = examples["gradient-descent"];
    expect(
      LessonSchema.safeParse({
        ...lesson,
        experiment: { ...lesson.experiment, learningRate: 9 },
      }).success,
    ).toBe(false);
    expect(
      LessonSchema.safeParse({ ...lesson, secret: "should never be shared" })
        .success,
    ).toBe(false);
    expect(
      LessonSchema.safeParse({
        ...lesson,
        sources: [{ ...lesson.sources[0], url: "javascript:alert(1)" }],
      }).success,
    ).toBe(false);
  });
  it("rejects duplicate source identities and dangling citations", () => {
    const lesson = examples["gradient-descent"];
    expect(
      LessonSchema.safeParse({
        ...lesson,
        sources: [lesson.sources[0], lesson.sources[0]],
      }).success,
    ).toBe(false);
    expect(
      LessonSchema.safeParse({ ...lesson, sourceIds: ["missing"] }).success,
    ).toBe(false);
  });
  it("preserves unicode text and source provenance in a share roundtrip", async () => {
    const lesson = {
      ...examples["monty-hall"],
      title: "换门，真的会更容易赢吗？🚪",
    };
    const encoded = await encodeLesson(lesson);
    expect(encoded).toMatch(/^v1\./);
    expect(await decodeLesson(encoded)).toEqual(lesson);
  });
  it("rejects damaged, unsupported and oversized links", async () => {
    await expect(decodeLesson("v2.abc")).rejects.toThrow();
    await expect(decodeLesson("v1.not-gzip")).rejects.toThrow();
    await expect(decodeLesson("v1." + "a".repeat(12001))).rejects.toThrow();
    const bomb = "v1." + gzipSync("a".repeat(70000)).toString("base64url");
    await expect(decodeLesson(bomb)).rejects.toThrow(/过大|大小|上限/);
    expect(() => parseLessonFile("x".repeat(70000))).toThrow();
  });
});
