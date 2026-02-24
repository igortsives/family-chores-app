import {
  areAllChoresDone,
  kidDaySubheading,
  kidMotivationMessage,
  resolveTimeOfDayMode,
  willAllChoresBeDoneAfterSubmit,
} from "@/app/app/my-chores/ui-helpers";

describe("my-chores ui helpers", () => {
  describe("resolveTimeOfDayMode", () => {
    it("uses forced mode when valid", () => {
      expect(resolveTimeOfDayMode("morning", new Date(2026, 1, 20, 19, 0, 0))).toBe("morning");
      expect(resolveTimeOfDayMode("afternoon", new Date(2026, 1, 20, 7, 0, 0))).toBe("afternoon");
      expect(resolveTimeOfDayMode("evening", new Date(2026, 1, 20, 10, 0, 0))).toBe("evening");
    });

    it("falls back to local hour buckets when forced mode is invalid", () => {
      expect(resolveTimeOfDayMode("nope", new Date(2026, 1, 20, 8, 59, 0))).toBe("morning");
      expect(resolveTimeOfDayMode(null, new Date(2026, 1, 20, 14, 0, 0))).toBe("afternoon");
      expect(resolveTimeOfDayMode(undefined, new Date(2026, 1, 20, 20, 0, 0))).toBe("evening");
    });
  });

  describe("kidMotivationMessage", () => {
    it("returns mode-specific kid message", () => {
      expect(kidMotivationMessage("morning")).toMatch(/Morning mission/i);
      expect(kidMotivationMessage("afternoon")).toMatch(/Awesome afternoon/i);
      expect(kidMotivationMessage("evening")).toMatch(/Evening hero mode/i);
    });
  });

  describe("areAllChoresDone", () => {
    it("returns false when not kid view or rows are empty", () => {
      expect(areAllChoresDone([], true)).toBe(false);
      expect(areAllChoresDone(null, true)).toBe(false);
      expect(areAllChoresDone([{ todayStatus: "APPROVED" }], false)).toBe(false);
    });

    it("returns true only when all rows are pending or approved", () => {
      expect(
        areAllChoresDone(
          [{ todayStatus: "PENDING" }, { todayStatus: "APPROVED" }],
          true,
        ),
      ).toBe(true);
      expect(
        areAllChoresDone(
          [{ todayStatus: "PENDING" }, { todayStatus: "NOT_DONE" }],
          true,
        ),
      ).toBe(false);
    });
  });

  describe("willAllChoresBeDoneAfterSubmit", () => {
    it("projects the tapped chore as pending and checks all-done", () => {
      const rows = [
        { choreId: "a", todayStatus: "NOT_DONE" },
        { choreId: "b", todayStatus: "APPROVED" },
      ];
      expect(willAllChoresBeDoneAfterSubmit(rows, "a")).toBe(true);
    });

    it("returns false when other chores remain undone", () => {
      const rows = [
        { choreId: "a", todayStatus: "NOT_DONE" },
        { choreId: "b", todayStatus: "NOT_DONE" },
      ];
      expect(willAllChoresBeDoneAfterSubmit(rows, "a")).toBe(false);
    });
  });

  describe("kidDaySubheading", () => {
    const motivation = "Keep going!";

    it("uses motivational text for today when chores are not fully done", () => {
      expect(
        kidDaySubheading(
          [{ todayStatus: "NOT_DONE" }, { todayStatus: "PENDING" }],
          true,
          motivation,
        ),
      ).toBe(motivation);
    });

    it("uses all-done text for today when all chores are done", () => {
      expect(
        kidDaySubheading(
          [{ todayStatus: "PENDING" }, { todayStatus: "APPROVED" }],
          true,
          motivation,
        ),
      ).toMatch(/finished all your chores/i);
    });

    it("uses approved-all text for past day when all chores were approved", () => {
      expect(
        kidDaySubheading(
          [{ todayStatus: "APPROVED" }, { todayStatus: "APPROVED" }],
          false,
          motivation,
        ),
      ).toBe("Great work that day.");
    });

    it("uses partial text for past day when only some chores were completed", () => {
      expect(
        kidDaySubheading(
          [{ todayStatus: "APPROVED" }, { todayStatus: "NOT_DONE" }],
          false,
          motivation,
        ),
      ).toBe("Nice effort that day.");
    });

    it("uses positive text for past day when no chores were completed", () => {
      expect(
        kidDaySubheading(
          [{ todayStatus: "NOT_DONE" }, { todayStatus: "NOT_DONE" }],
          false,
          motivation,
        ),
      ).toBe("Next time, you've got this.");
    });
  });
});
