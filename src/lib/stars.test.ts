import { describe, expect, it } from "vitest";
import { distributeStarsFromWeeklyScores } from "@/lib/stars";

describe("star progress distribution", () => {
  it("carries partial progress across weeks", () => {
    const out = distributeStarsFromWeeklyScores([0.4, 0.3, 0.5]);
    expect(out.earnedPerWeek).toEqual([0, 0, 1]);
    expect(out.totalStars).toBe(1);
    expect(out.progressRemainder).toBeCloseTo(0.2, 6);
  });

  it("can earn stars in consecutive high-score weeks", () => {
    const out = distributeStarsFromWeeklyScores([0.95, 0.95, 0.95]);
    expect(out.earnedPerWeek).toEqual([0, 1, 1]);
    expect(out.totalStars).toBe(2);
    expect(out.progressRemainder).toBeCloseTo(0.85, 6);
  });

  it("clamps invalid values to safe range", () => {
    const out = distributeStarsFromWeeklyScores([2, -1, Number.NaN, 0.25]);
    expect(out.earnedPerWeek).toEqual([1, 0, 0, 0]);
    expect(out.totalStars).toBe(1);
    expect(out.progressRemainder).toBeCloseTo(0.25, 6);
  });
});

