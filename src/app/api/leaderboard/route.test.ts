import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    award: { findMany: vi.fn() },
    choreAssignment: { findMany: vi.fn() },
    choreCompletion: { findMany: vi.fn(), groupBy: vi.fn() },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/leaderboard/route";

const getServerSessionMock = vi.mocked(getServerSession);
const findMeMock = vi.mocked(prisma.user.findUnique as any);
const findKidsMock = vi.mocked(prisma.user.findMany as any);
const findAwardsMock = vi.mocked(prisma.award.findMany as any);
const findAssignmentsMock = vi.mocked(prisma.choreAssignment.findMany as any);
const findCompletionsMock = vi.mocked(prisma.choreCompletion.findMany as any);
const groupByPointsMock = vi.mocked(prisma.choreCompletion.groupBy as any);

describe("GET /api/leaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-18T12:00:00.000Z"));

    getServerSessionMock.mockResolvedValue({ user: { email: "adult@example.com" } } as any);
    findMeMock.mockResolvedValue({ id: "adult-1", familyId: "fam-1" });
    findAwardsMock.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 401 when session email is missing", async () => {
    getServerSessionMock.mockResolvedValue({ user: {} } as any);

    const res = await GET();

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("ranks by normalized score instead of lifetime points and dedupes weekly completions", async () => {
    findKidsMock.mockResolvedValue([
      { id: "kid-a", name: "Alpha", email: "alpha@example.com" },
      { id: "kid-b", name: "Beta", email: "beta@example.com" },
    ]);

    findAssignmentsMock.mockResolvedValue([
      {
        userId: "kid-a",
        chore: { schedules: [{ frequency: "DAILY", dayOfWeek: null }] },
      },
      {
        userId: "kid-b",
        chore: { schedules: [{ frequency: "WEEKLY", dayOfWeek: 2 }] },
      },
    ]);

    findCompletionsMock.mockResolvedValue([
      {
        userId: "kid-b",
        pointsEarned: 1,
        completedAt: new Date("2026-02-18T08:00:00.000Z"),
        choreInstanceId: "inst-1",
        choreInstance: { dueDate: new Date("2026-02-17T09:00:00.000Z") },
      },
      {
        userId: "kid-b",
        pointsEarned: 7,
        completedAt: new Date("2026-02-18T10:00:00.000Z"),
        choreInstanceId: "inst-1",
        choreInstance: { dueDate: new Date("2026-02-17T09:00:00.000Z") },
      },
      {
        userId: "kid-a",
        pointsEarned: 20,
        completedAt: new Date("2026-02-14T10:00:00.000Z"),
        choreInstanceId: "inst-old",
        choreInstance: { dueDate: new Date("2026-02-14T09:00:00.000Z") },
      },
    ]);

    groupByPointsMock.mockResolvedValue([
      { userId: "kid-a", _sum: { pointsEarned: 100 } },
      { userId: "kid-b", _sum: { pointsEarned: 7 } },
    ]);

    const res = await GET();

    expect(res.status).toBe(200);
    const json = await res.json();

    expect(findKidsMock).toHaveBeenCalledWith({
      where: { familyId: "fam-1", role: "KID", isHidden: false },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    });

    expect(json.meta.rankingPolicy).toBe("RANK_BY_NORMALIZED_SCORE_ONLY");
    expect(json.rows[0].kid.id).toBe("kid-b");
    expect(json.rows[0].approvedCount).toBe(1);
    expect(json.rows[0].weeklyPoints).toBe(7);
    expect(json.rows[1].kid.id).toBe("kid-a");
    expect(json.rows[1].points).toBe(100);
  });
});
