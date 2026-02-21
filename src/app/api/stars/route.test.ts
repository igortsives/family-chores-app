import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/requireUser", () => ({
  requireSessionUser: vi.fn(),
}));

vi.mock("@/lib/starProgress", () => ({
  recomputeStarWeeksForKid: vi.fn(),
}));

vi.mock("@/lib/notifications", () => ({
  syncAdultReminderNotificationsForFamily: vi.fn(),
  syncKidReminderNotifications: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findMany: vi.fn() },
    starWeek: { findMany: vi.fn() },
    starExchange: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { requireSessionUser } from "@/lib/requireUser";
import { recomputeStarWeeksForKid } from "@/lib/starProgress";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/stars/route";

const requireSessionUserMock = vi.mocked(requireSessionUser);
const recomputeMock = vi.mocked(recomputeStarWeeksForKid);
const findKidsMock = vi.mocked(prisma.user.findMany as any);
const starWeekFindManyMock = vi.mocked(prisma.starWeek.findMany as any);
const starExchangeAggregateMock = vi.mocked(prisma.starExchange.aggregate as any);
const starExchangeFindManyMock = vi.mocked(prisma.starExchange.findMany as any);
const starExchangeCreateMock = vi.mocked(prisma.starExchange.create as any);

describe("/api/stars", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    starWeekFindManyMock.mockResolvedValue([{ earned: 2 }, { earned: 1 }]);
    starExchangeAggregateMock.mockResolvedValue({ _sum: { stars: 1 } });
    starExchangeFindManyMock.mockResolvedValue([]);
  });

  it("GET returns kid progress percentages", async () => {
    requireSessionUserMock.mockResolvedValue({
      me: { id: "kid-1", role: "KID", familyId: "fam-1", username: "kid", name: "Kid" },
    } as any);
    recomputeMock.mockResolvedValue({
      totalStars: 3,
      carryoverProgress: 0.25,
      currentWeekProgress: 0.3,
      progressTowardNextStar: 0.55,
    });

    const res = await GET();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      progressTowardNextStarPct: 55,
      carryoverProgressPct: 25,
      currentWeekProgressPct: 30,
      familyProgress: [],
    });
    expect(recomputeMock).toHaveBeenCalledWith("kid-1", "fam-1");
    expect(findKidsMock).not.toHaveBeenCalled();
  });

  it("GET returns parent family progress for active visible kids", async () => {
    requireSessionUserMock.mockResolvedValue({
      me: { id: "adult-1", role: "ADULT", familyId: "fam-1", username: "igor", name: "Igor" },
    } as any);
    findKidsMock.mockResolvedValue([
      { id: "kid-a", name: "A", username: "a" },
      { id: "kid-b", name: "B", username: "b" },
    ]);
    recomputeMock
      .mockResolvedValueOnce({ totalStars: 1, carryoverProgress: 0.1, currentWeekProgress: 0.2, progressTowardNextStar: 0.3 })
      .mockResolvedValueOnce({ totalStars: 2, carryoverProgress: 0.4, currentWeekProgress: 0.2, progressTowardNextStar: 0.6 });

    const res = await GET();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      familyProgress: [
        { kid: { id: "kid-a" }, carryoverPct: 10, currentWeekPct: 20, nextStarPct: 30 },
        { kid: { id: "kid-b" }, carryoverPct: 40, currentWeekPct: 20, nextStarPct: 60 },
      ],
    });
    expect(findKidsMock).toHaveBeenCalledWith({
      where: { familyId: "fam-1", role: "KID", isHidden: false, isActive: true },
      select: { id: true, name: true, username: true },
      orderBy: [{ name: "asc" }, { username: "asc" }],
    });
  });

  it("POST recomputes balance and rejects request when stars exceed available", async () => {
    requireSessionUserMock.mockResolvedValue({
      me: { id: "kid-1", role: "KID", familyId: "fam-1", username: "kid", name: "Kid" },
    } as any);
    recomputeMock.mockResolvedValue({
      totalStars: 1,
      carryoverProgress: 0,
      currentWeekProgress: 0,
      progressTowardNextStar: 0,
    });
    starWeekFindManyMock.mockResolvedValue([{ earned: 1 }]);
    starExchangeAggregateMock.mockResolvedValue({ _sum: { stars: 0 } });

    const req = new Request("http://localhost:3000/api/stars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stars: 2, note: "Please" }),
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "You do not have enough stars for that request." });
    expect(recomputeMock).toHaveBeenCalledWith("kid-1", "fam-1");
    expect(starExchangeCreateMock).not.toHaveBeenCalled();
  });
});
