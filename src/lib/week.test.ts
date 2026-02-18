import { describe, expect, it } from "vitest";
import { addDays, startOfWeekMonday } from "@/lib/week";

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

describe("week helpers", () => {
  it("returns Monday for a Wednesday date", () => {
    const d = new Date(2026, 1, 18, 12, 0, 0); // Wednesday local
    const monday = startOfWeekMonday(d);
    expect(ymd(monday)).toBe("2026-02-16");
    expect(monday.getHours()).toBe(0);
    expect(monday.getMinutes()).toBe(0);
  });

  it("returns previous Monday when date is Sunday", () => {
    const d = new Date(2026, 1, 22, 10, 0, 0); // Sunday local
    const monday = startOfWeekMonday(d);
    expect(ymd(monday)).toBe("2026-02-16");
    expect(monday.getHours()).toBe(0);
    expect(monday.getMinutes()).toBe(0);
  });

  it("does not mutate the input date", () => {
    const d = new Date(2026, 1, 18, 12, 0, 0);
    const before = d.toISOString();
    startOfWeekMonday(d);
    expect(d.toISOString()).toBe(before);
  });

  it("adds days without mutating input", () => {
    const d = new Date(2026, 1, 18, 0, 0, 0);
    const out = addDays(d, 7);
    expect(ymd(out)).toBe("2026-02-25");
    expect(ymd(d)).toBe("2026-02-18");
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });
});
