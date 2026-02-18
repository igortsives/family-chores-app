import { describe, expect, it } from "vitest";
import { computeStreak, dayKey } from "@/lib/leaderboard";

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
});
