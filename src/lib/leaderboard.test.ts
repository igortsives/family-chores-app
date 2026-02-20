import { describe, expect, it } from "vitest";
import { computeHybridScore, computeStreak, dayKey } from "@/lib/leaderboard";

describe("leaderboard helpers", () => {
  it("normalizes to day key", () => {
    const d = new Date("2026-02-18T22:31:00.000Z");
    expect(dayKey(d)).toBe("2026-02-18");
  });

  it("returns 0 streak when there is no activity today or yesterday", () => {
    const now = new Date("2026-02-18T12:00:00.000Z");
    const keys = ["2026-02-10", "2026-02-11"];
    expect(computeStreak(keys, now)).toBe(0);
  });

  it("counts streak ending today", () => {
    const now = new Date("2026-02-18T12:00:00.000Z");
    const keys = ["2026-02-16", "2026-02-17", "2026-02-18"];
    expect(computeStreak(keys, now)).toBe(3);
  });

  it("counts streak ending yesterday if today has none", () => {
    const now = new Date("2026-02-18T12:00:00.000Z");
    const keys = ["2026-02-15", "2026-02-16", "2026-02-17"];
    expect(computeStreak(keys, now)).toBe(3);
  });

  it("stops streak on missing day gap", () => {
    const now = new Date("2026-02-18T12:00:00.000Z");
    const keys = ["2026-02-14", "2026-02-16", "2026-02-17", "2026-02-18"];
    expect(computeStreak(keys, now)).toBe(3);
  });

  it("computes hybrid score using completion, consistency and streak weights", () => {
    const out = computeHybridScore({
      expectedDue: 10,
      approvedCount: 8,
      possibleActiveDays: 5,
      activeDays: 4,
      streakDays: 4,
    });

    expect(out.completionRate).toBeCloseTo(0.8, 6);
    expect(out.consistencyRate).toBeCloseTo(0.8, 6);
    expect(out.streakFactor).toBeCloseTo(4 / 7, 6);
    expect(out.score).toBeCloseTo(0.777142, 5);
    expect(out.scorePct).toBe(78);
  });

  it("clamps rates when inputs exceed denominators", () => {
    const out = computeHybridScore({
      expectedDue: 2,
      approvedCount: 5,
      possibleActiveDays: 3,
      activeDays: 9,
      streakDays: 12,
    });

    expect(out.completionRate).toBe(1);
    expect(out.consistencyRate).toBe(1);
    expect(out.streakFactor).toBe(1);
    expect(out.score).toBe(1);
    expect(out.scorePct).toBe(100);
  });
});
