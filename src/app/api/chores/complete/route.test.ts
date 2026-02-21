import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/requireUser", () => ({
  requireSessionUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    chore: { findFirst: vi.fn() },
    choreInstance: { findFirst: vi.fn(), create: vi.fn() },
    choreCompletion: { findFirst: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/lib/notifications", () => ({
  syncAdultReminderNotificationsForFamily: vi.fn(),
  syncKidReminderNotifications: vi.fn(),
}));

import { requireSessionUser } from "@/lib/requireUser";
import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/chores/complete/route";

const requireSessionUserMock = vi.mocked(requireSessionUser);
const findChoreMock = vi.mocked(prisma.chore.findFirst as any);
const findInstanceMock = vi.mocked(prisma.choreInstance.findFirst as any);
const createInstanceMock = vi.mocked(prisma.choreInstance.create as any);
const findCompletionMock = vi.mocked(prisma.choreCompletion.findFirst as any);
const createCompletionMock = vi.mocked(prisma.choreCompletion.create as any);

describe("POST /api/chores/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when auth guard rejects", async () => {
    requireSessionUserMock.mockResolvedValue({ status: 401, error: "Unauthorized" } as any);

    const req = new Request("http://localhost:3000/api/chores/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ choreId: "c1" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns existing non-rejected completion instead of creating another", async () => {
    requireSessionUserMock.mockResolvedValue({ me: { id: "u1", familyId: "f1", role: "KID" } } as any);
    findChoreMock.mockResolvedValue({ id: "c1", points: 3, familyId: "f1" });
    findInstanceMock.mockResolvedValueOnce({ id: "i1" });
    findCompletionMock.mockResolvedValue({ id: "cmp-1", status: "PENDING" });

    const req = new Request("http://localhost:3000/api/chores/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ choreId: "c1", instanceId: "i1" }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, completionId: "cmp-1", status: "PENDING" });
    expect(createCompletionMock).not.toHaveBeenCalled();
  });

  it("creates a new pending completion when latest completion was rejected", async () => {
    requireSessionUserMock.mockResolvedValue({ me: { id: "u1", familyId: "f1", role: "KID" } } as any);
    findChoreMock.mockResolvedValue({ id: "c1", points: 3, familyId: "f1" });
    findInstanceMock.mockResolvedValueOnce(null);
    createInstanceMock.mockResolvedValue({ id: "i1" });
    findCompletionMock.mockResolvedValue({ id: "cmp-old", status: "REJECTED" });
    createCompletionMock.mockResolvedValue({ id: "cmp-new", status: "PENDING" });

    const req = new Request("http://localhost:3000/api/chores/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ choreId: "c1" }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, completionId: "cmp-new", status: "PENDING" });
    expect(createCompletionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "u1",
          status: "PENDING",
          pointsEarned: 3,
        }),
      }),
    );
  });

  it("returns 403 for adult users", async () => {
    requireSessionUserMock.mockResolvedValue({ me: { id: "u2", familyId: "f1", role: "ADULT" } } as any);

    const req = new Request("http://localhost:3000/api/chores/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ choreId: "c1" }),
    });

    const res = await POST(req);

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "Only kids can complete chores" });
    expect(findChoreMock).not.toHaveBeenCalled();
    expect(createCompletionMock).not.toHaveBeenCalled();
  });
});
