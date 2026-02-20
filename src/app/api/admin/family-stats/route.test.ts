import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/requireUser", () => ({
  requireAdult: vi.fn(),
}));

vi.mock("@/lib/starProgress", () => ({
  recomputeStarWeeksForKid: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findMany: vi.fn() },
    award: { findMany: vi.fn() },
    choreAssignment: { findMany: vi.fn() },
    choreCompletion: { findMany: vi.fn(), groupBy: vi.fn() },
    starExchange: { groupBy: vi.fn() },
  },
}));

import { requireAdult } from "@/lib/requireUser";
import { recomputeStarWeeksForKid } from "@/lib/starProgress";
import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/admin/family-stats/route";

const requireAdultMock = vi.mocked(requireAdult);
const recomputeMock = vi.mocked(recomputeStarWeeksForKid);
const findKidsMock = vi.mocked(prisma.user.findMany as any);
const findAwardsMock = vi.mocked(prisma.award.findMany as any);
const findAssignmentsMock = vi.mocked(prisma.choreAssignment.findMany as any);
const findCompletionsMock = vi.mocked(prisma.choreCompletion.findMany as any);
const groupByPointsMock = vi.mocked(prisma.choreCompletion.groupBy as any);
const groupBySpentMock = vi.mocked(prisma.starExchange.groupBy as any);

describe("GET /api/admin/family-stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-18T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns auth error when adult session is missing", async () => {
    requireAdultMock.mockResolvedValue({ status: 401, error: "Unauthorized" } as any);

    const res = await GET();

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns zeroed totals when no active visible kids are found", async () => {
    requireAdultMock.mockResolvedValue({ me: { id: "adult-1", familyId: "fam-1" } } as any);
    findKidsMock.mockResolvedValue([]);
    findAwardsMock.mockResolvedValue([]);

    const res = await GET();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      rows: [],
      totals: {
        participants: 0,
        weeklyCoins: 0,
        lifetimeCoins: 0,
        starsEarned: 0,
      },
    });
  });

  it("computes ranked rows and aggregate totals", async () => {
    requireAdultMock.mockResolvedValue({ me: { id: "adult-1", familyId: "fam-1" } } as any);
    findKidsMock.mockResolvedValue([
      { id: "kid-a", name: "Alpha", username: "alpha", email: "alpha@example.com" },
      { id: "kid-b", name: "Beta", username: "beta", email: "beta@example.com" },
    ]);
    findAwardsMock.mockResolvedValue([{ id: "award-1", name: "Bronze", icon: "🥉", thresholdPoints: 10 }]);

    findAssignmentsMock.mockResolvedValue([
      { userId: "kid-a", chore: { schedules: [{ frequency: "DAILY", dayOfWeek: null }] } },
      { userId: "kid-b", chore: { schedules: [{ frequency: "WEEKLY", dayOfWeek: 2 }] } },
    ]);

    findCompletionsMock.mockResolvedValue([
      {
        userId: "kid-a",
        pointsEarned: 2,
        completedAt: new Date("2026-02-16T18:00:00.000Z"),
        choreInstanceId: "inst-a",
        choreInstance: { dueDate: new Date("2026-02-16T08:00:00.000Z") },
      },
      {
        userId: "kid-b",
        pointsEarned: 1,
        completedAt: new Date("2026-02-17T18:00:00.000Z"),
        choreInstanceId: "inst-b",
        choreInstance: { dueDate: new Date("2026-02-17T08:00:00.000Z") },
      },
    ]);

    groupByPointsMock.mockResolvedValue([
      { userId: "kid-a", _sum: { pointsEarned: 20 } },
      { userId: "kid-b", _sum: { pointsEarned: 5 } },
    ]);
    groupBySpentMock.mockResolvedValue([{ userId: "kid-a", _sum: { stars: 1 } }]);

    recomputeMock
      .mockResolvedValueOnce({ totalStars: 3, carryoverProgress: 0.3, currentWeekProgress: 0.2, progressTowardNextStar: 0.5 })
      .mockResolvedValueOnce({ totalStars: 1, carryoverProgress: 0.1, currentWeekProgress: 0.1, progressTowardNextStar: 0.2 });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.rows).toHaveLength(2);
    expect(json.rows[0]).toMatchObject({
      rank: 1,
      kid: { id: "kid-b" },
      approvedThisWeek: 1,
      expectedThisWeek: 1,
      weeklyCoins: 1,
      lifetimeCoins: 5,
      starBalance: 1,
    });
    expect(json.rows[1]).toMatchObject({
      rank: 2,
      kid: { id: "kid-a" },
      awardsUnlocked: 1,
      weeklyCoins: 2,
      lifetimeCoins: 20,
      starBalance: 2,
    });
    expect(json.totals).toMatchObject({
      participants: 2,
      weeklyCoins: 3,
      lifetimeCoins: 25,
      starsEarned: 4,
      starsBalance: 3,
      approvedThisWeek: 2,
      expectedThisWeek: 8,
      overallCompletionPct: 25,
    });
  });
});
