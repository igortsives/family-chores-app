import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    choreAssignment: { findMany: vi.fn() },
    choreInstance: { findFirst: vi.fn(), findMany: vi.fn() },
    choreCompletion: { findMany: vi.fn() },
    starWeek: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn(async (ops: any[]) => Promise.all(ops)),
  },
}));

vi.mock("@/lib/notifications", () => ({
  createNotification: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { recomputeStarWeeksForKid } from "@/lib/starProgress";

const assignmentFindManyMock = vi.mocked(prisma.choreAssignment.findMany as any);
const choreInstanceFindFirstMock = vi.mocked(prisma.choreInstance.findFirst as any);
const choreInstanceFindManyMock = vi.mocked(prisma.choreInstance.findMany as any);
const choreCompletionFindManyMock = vi.mocked(prisma.choreCompletion.findMany as any);
const starWeekAggregateMock = vi.mocked(prisma.starWeek.aggregate as any);
const starWeekFindManyMock = vi.mocked(prisma.starWeek.findMany as any);
const starWeekUpsertMock = vi.mocked(prisma.starWeek.upsert as any);
const transactionMock = vi.mocked(prisma.$transaction as any);
const createNotificationMock = vi.mocked(createNotification);

function makeClosedWeek() {
  const dueDates = [
    "2026-02-09",
    "2026-02-10",
    "2026-02-11",
    "2026-02-12",
    "2026-02-13",
    "2026-02-14",
    "2026-02-15",
  ];

  const closedInstances = dueDates.map((day, idx) => ({
    id: `i${idx + 1}`,
    dueDate: new Date(`${day}T10:00:00.000Z`),
  }));

  const completions = closedInstances.map((inst) => ({
    choreInstanceId: inst.id,
    completedAt: new Date(inst.dueDate),
  }));

  return { closedInstances, completions };
}

describe("recomputeStarWeeksForKid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-20T12:00:00.000Z"));
    starWeekUpsertMock.mockResolvedValue({} as any);
    transactionMock.mockImplementation(async (ops: any[]) => Promise.all(ops));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns existing earned total and zero progress when kid has no assignments", async () => {
    assignmentFindManyMock.mockResolvedValue([]);
    starWeekAggregateMock.mockResolvedValue({ _sum: { earned: 3 } });

    const out = await recomputeStarWeeksForKid("kid-1", "fam-1");

    expect(out).toEqual({
      totalStars: 3,
      carryoverProgress: 0,
      currentWeekProgress: 0,
      progressTowardNextStar: 0,
    });
    expect(starWeekAggregateMock).toHaveBeenCalledWith({
      where: { userId: "kid-1" },
      _sum: { earned: true },
    });
    expect(createNotificationMock).not.toHaveBeenCalled();
  });

  it("creates a star-earned notification when closed weeks produce newly awarded stars", async () => {
    const { closedInstances, completions } = makeClosedWeek();

    assignmentFindManyMock.mockResolvedValue([{ choreId: "c1" }]);
    choreInstanceFindFirstMock.mockResolvedValue({ dueDate: new Date("2026-02-09T10:00:00.000Z") });
    choreInstanceFindManyMock
      .mockResolvedValueOnce(closedInstances)
      .mockResolvedValueOnce([]);
    choreCompletionFindManyMock
      .mockResolvedValueOnce(completions)
      .mockResolvedValueOnce([]);
    starWeekFindManyMock.mockResolvedValue([]);

    const out = await recomputeStarWeeksForKid("kid-1", "fam-1", { notifyOnNewStars: true });

    expect(starWeekUpsertMock).toHaveBeenCalledTimes(1);
    expect(createNotificationMock).toHaveBeenCalledTimes(1);
    expect(createNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "kid-1",
        kind: "UPDATE",
        severity: "SUCCESS",
        href: "/app/awards",
      }),
    );
    expect(out.totalStars).toBe(1);
    expect(out.progressTowardNextStar).toBeGreaterThanOrEqual(0);
    expect(out.progressTowardNextStar).toBeLessThan(1);
  });

  it("does not send notification when notifyOnNewStars is false", async () => {
    const { closedInstances, completions } = makeClosedWeek();

    assignmentFindManyMock.mockResolvedValue([{ choreId: "c1" }]);
    choreInstanceFindFirstMock.mockResolvedValue({ dueDate: new Date("2026-02-09T10:00:00.000Z") });
    choreInstanceFindManyMock
      .mockResolvedValueOnce(closedInstances)
      .mockResolvedValueOnce([]);
    choreCompletionFindManyMock
      .mockResolvedValueOnce(completions)
      .mockResolvedValueOnce([]);
    starWeekFindManyMock.mockResolvedValue([]);

    await recomputeStarWeeksForKid("kid-1", "fam-1", { notifyOnNewStars: false });

    expect(starWeekUpsertMock).toHaveBeenCalledTimes(1);
    expect(createNotificationMock).not.toHaveBeenCalled();
  });
});
