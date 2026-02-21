import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/requireUser", () => ({
  requireAdult: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    choreCompletion: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
    },
    award: {
      findMany: vi.fn(),
    },
    userAward: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/notifications", () => ({
  createNotification: vi.fn(),
  syncAdultReminderNotificationsForFamily: vi.fn(),
  syncKidReminderNotifications: vi.fn(),
}));

import { requireAdult } from "@/lib/requireUser";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { GET, POST } from "@/app/api/admin/approvals/route";

const requireAdultMock = vi.mocked(requireAdult);
const findPendingMock = vi.mocked(prisma.choreCompletion.findMany as any);
const findCompletionMock = vi.mocked(prisma.choreCompletion.findFirst as any);
const updateCompletionMock = vi.mocked(prisma.choreCompletion.update as any);
const aggregateCompletionsMock = vi.mocked(prisma.choreCompletion.aggregate as any);
const findAwardsMock = vi.mocked(prisma.award.findMany as any);
const findUserAwardsMock = vi.mocked(prisma.userAward.findMany as any);
const createUserAwardsMock = vi.mocked(prisma.userAward.createMany as any);
const createNotificationMock = vi.mocked(createNotification);

describe("admin approvals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns 401 when auth guard rejects", async () => {
    requireAdultMock.mockResolvedValue({ status: 401, error: "Unauthorized" } as any);

    const res = await GET();
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(findPendingMock).not.toHaveBeenCalled();
  });

  it("GET returns 403 for kid role", async () => {
    requireAdultMock.mockResolvedValue({ status: 403, error: "Forbidden" } as any);

    const res = await GET();
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("POST requires rejection reason for REJECT action", async () => {
    requireAdultMock.mockResolvedValue({ me: { id: "adult-1", familyId: "fam-1", role: "ADULT" } } as any);

    const req = new Request("http://localhost/api/admin/approvals", {
      method: "POST",
      body: JSON.stringify({ completionId: "c1", action: "REJECT" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Rejection reason is required" });
    expect(findCompletionMock).not.toHaveBeenCalled();
  });

  it("POST APPROVE updates completion, grants awards, and sends success notification", async () => {
    requireAdultMock.mockResolvedValue({ me: { id: "adult-1", familyId: "fam-1", role: "ADULT" } } as any);

    findCompletionMock.mockResolvedValue({ id: "c1", userId: "kid-1", user: { role: "KID" } });
    updateCompletionMock.mockResolvedValue({ id: "c1" });
    aggregateCompletionsMock.mockResolvedValue({ _sum: { pointsEarned: 12 } });
    findAwardsMock.mockResolvedValue([
      { id: "award-1", thresholdPoints: 10 },
      { id: "award-2", thresholdPoints: 20 },
    ]);
    findUserAwardsMock.mockResolvedValue([{ awardId: "award-2" }]);
    createUserAwardsMock.mockResolvedValue({ count: 1 });

    const req = new Request("http://localhost/api/admin/approvals", {
      method: "POST",
      body: JSON.stringify({ completionId: "c1", action: "APPROVE" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, status: "APPROVED" });
    expect(updateCompletionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "c1" },
        data: expect.objectContaining({
          status: "APPROVED",
          rejectionReason: null,
        }),
      }),
    );
    expect(createUserAwardsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [{ userId: "kid-1", awardId: "award-1", completionId: "c1" }],
        skipDuplicates: true,
      }),
    );
    expect(createNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "kid-1",
        sourceKey: "completion-c1-approved",
        severity: "SUCCESS",
      }),
    );
  });

  it("POST REJECT stores reason and sends error notification", async () => {
    requireAdultMock.mockResolvedValue({ me: { id: "adult-1", familyId: "fam-1", role: "ADULT" } } as any);

    findCompletionMock.mockResolvedValue({ id: "c1", userId: "kid-1", user: { role: "KID" } });
    updateCompletionMock.mockResolvedValue({ id: "c1" });

    const req = new Request("http://localhost/api/admin/approvals", {
      method: "POST",
      body: JSON.stringify({ completionId: "c1", action: "REJECT", rejectionReason: "Please tidy up better" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, status: "REJECTED" });
    expect(updateCompletionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "c1" },
        data: expect.objectContaining({
          status: "REJECTED",
          rejectionReason: "Please tidy up better",
        }),
      }),
    );
    expect(createNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "kid-1",
        sourceKey: "completion-c1-rejected",
        severity: "ERROR",
      }),
    );
  });

  it("POST returns 401 when auth guard rejects", async () => {
    requireAdultMock.mockResolvedValue({ status: 401, error: "Unauthorized" } as any);

    const req = new Request("http://localhost/api/admin/approvals", {
      method: "POST",
      body: JSON.stringify({ completionId: "c1", action: "APPROVE" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("GET maps pending approvals payload", async () => {
    requireAdultMock.mockResolvedValue({ me: { id: "adult-1", familyId: "fam-1", role: "ADULT" } } as any);
    findPendingMock.mockResolvedValue([
      {
        id: "c1",
        completedAt: new Date("2026-02-20T10:00:00.000Z"),
        pointsEarned: 3,
        user: { id: "kid-1", name: "Kid", email: "kid@example.com", role: "KID" },
        choreInstance: {
          dueDate: new Date("2026-02-20T08:00:00.000Z"),
          chore: { id: "ch-1", title: "Unload", points: 3 },
        },
      },
    ]);

    const res = await GET();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      pending: [
        {
          id: "c1",
          kid: { id: "kid-1", name: "Kid" },
          chore: { id: "ch-1", title: "Unload" },
        },
      ],
    });
  });
});
