import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

vi.mock("@/lib/requireUser", () => ({
  requireSessionUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    chore: {
      findMany: vi.fn(),
    },
    choreInstance: {
      findMany: vi.fn(),
    },
  },
}));

import { requireSessionUser } from "@/lib/requireUser";
import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/my-chores/route";

const requireSessionUserMock = vi.mocked(requireSessionUser);
const findChoresMock = vi.mocked(prisma.chore.findMany as any);
const findInstancesMock = vi.mocked(prisma.choreInstance.findMany as any);

function missingRejectionReasonError() {
  const err = new Error("column \"rejectionReason\" does not exist") as any;
  Object.setPrototypeOf(err, Prisma.PrismaClientKnownRequestError.prototype);
  err.code = "P2022";
  return err;
}

describe("GET /api/my-chores", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when auth guard rejects", async () => {
    requireSessionUserMock.mockResolvedValue({ status: 401, error: "Unauthorized" } as any);

    const res = await GET();
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(findChoresMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid date query", async () => {
    requireSessionUserMock.mockResolvedValue({ me: {
      id: "u1",
      familyId: "f1",
      role: "KID",
      name: "Kid",
      email: "kid@example.com",
    } } as any);

    const req = new Request("http://localhost:3000/api/my-chores?date=2026-02-99");
    const res = await GET(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Invalid date. Use YYYY-MM-DD." });
  });

  it("returns 403 for adult users", async () => {
    requireSessionUserMock.mockResolvedValue({ me: {
      id: "u1",
      familyId: "f1",
      role: "ADULT",
      name: "Parent",
      email: "parent@example.com",
    } } as any);

    const res = await GET();
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "Only kids can view chores" });
    expect(findChoresMock).not.toHaveBeenCalled();
  });

  it("filters chores by selected day schedule and returns selected date in response", async () => {
    requireSessionUserMock.mockResolvedValue({ me: {
      id: "u1",
      familyId: "f1",
      role: "KID",
      name: "Kid",
      email: "kid@example.com",
    } } as any);

    findChoresMock.mockResolvedValue([
      { id: "c1", title: "Unload Dishwasher", description: "Daily", points: 3, active: true },
    ]);
    findInstancesMock.mockResolvedValue([
      {
        id: "i1",
        choreId: "c1",
        dueDate: new Date("2026-02-17T08:00:00.000Z"),
        completions: [
          {
            id: "cmp-1",
            status: "PENDING",
            completedAt: new Date("2026-02-17T10:00:00.000Z"),
            pointsEarned: 3,
            rejectionReason: null,
          },
        ],
      },
    ]);

    const req = new Request("http://localhost:3000/api/my-chores?date=2026-02-17");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(findChoresMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { schedules: { some: { frequency: "DAILY" } } },
            { schedules: { some: { frequency: "WEEKLY", dayOfWeek: 2 } } },
            { schedules: { none: {} } },
          ],
        }),
      }),
    );

    const json = await res.json();
    expect(String(json.date).startsWith("2026-02-17")).toBe(true);
    expect(json.chores[0]).toMatchObject({
      choreId: "c1",
      todayStatus: "PENDING",
      todayCompletionId: "cmp-1",
    });
  });

  it("falls back when rejectionReason column is missing", async () => {
    requireSessionUserMock.mockResolvedValue({ me: {
      id: "u1",
      familyId: "f1",
      role: "KID",
      name: "Kid",
      email: "kid@example.com",
    } } as any);

    findChoresMock.mockResolvedValue([
      { id: "c1", title: "Unload Dishwasher", description: "Daily", points: 3, active: true },
    ]);
    findInstancesMock
      .mockRejectedValueOnce(missingRejectionReasonError())
      .mockResolvedValueOnce([
        {
          id: "i1",
          choreId: "c1",
          dueDate: new Date("2026-02-17T08:00:00.000Z"),
          completions: [
            {
              id: "cmp-1",
              status: "REJECTED",
              completedAt: new Date("2026-02-17T10:00:00.000Z"),
              pointsEarned: 3,
            },
          ],
        },
      ]);

    const req = new Request("http://localhost:3000/api/my-chores?date=2026-02-17");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.chores[0]).toMatchObject({
      todayStatus: "REJECTED",
      todayRejectionReason: null,
    });
  });
});
