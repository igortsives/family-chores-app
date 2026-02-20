import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/requireUser", () => ({
  requireSessionUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    choreCompletion: { aggregate: vi.fn() },
    starWeek: { aggregate: vi.fn() },
  },
}));

import { requireSessionUser } from "@/lib/requireUser";
import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/kid-summary/route";

const requireSessionUserMock = vi.mocked(requireSessionUser);
const pointsAggMock = vi.mocked(prisma.choreCompletion.aggregate as any);
const starsAggMock = vi.mocked(prisma.starWeek.aggregate as any);

describe("GET /api/kid-summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns auth error when session is missing", async () => {
    requireSessionUserMock.mockResolvedValue({ status: 401, error: "Unauthorized" } as any);
    const res = await GET();
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns 403 for non-kid roles", async () => {
    requireSessionUserMock.mockResolvedValue({
      me: { id: "u1", role: "ADULT", familyId: "f1", username: "parent", name: "Parent" },
    } as any);
    const res = await GET();
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "Kid view only" });
  });

  it("returns weekly points and total stars for kid users", async () => {
    requireSessionUserMock.mockResolvedValue({
      me: { id: "u1", role: "KID", familyId: "f1", username: "kid1", name: "Kid 1" },
    } as any);
    pointsAggMock.mockResolvedValue({ _sum: { pointsEarned: 14 } });
    starsAggMock.mockResolvedValue({ _sum: { earned: 6 } });

    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      weeklyPoints: 14,
      totalStarsEarned: 6,
    });
  });
});
