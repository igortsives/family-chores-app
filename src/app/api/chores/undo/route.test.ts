import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/requireUser", () => ({
  requireSessionUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    choreCompletion: { deleteMany: vi.fn(), findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/notifications", () => ({
  syncAdultReminderNotificationsForFamily: vi.fn(),
  syncKidReminderNotifications: vi.fn(),
}));

import { requireSessionUser } from "@/lib/requireUser";
import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/chores/undo/route";

const requireSessionUserMock = vi.mocked(requireSessionUser);
const deleteManyMock = vi.mocked(prisma.choreCompletion.deleteMany as any);
const findCompletionMock = vi.mocked(prisma.choreCompletion.findFirst as any);

describe("POST /api/chores/undo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 for non-kid users", async () => {
    requireSessionUserMock.mockResolvedValue({ me: { id: "u1", familyId: "f1", role: "ADULT" } } as any);

    const req = new Request("http://localhost:3000/api/chores/undo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completionId: "c1" }),
    });

    const res = await POST(req);

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "Only kids can undo completion" });
  });

  it("returns 400 when completionId is missing", async () => {
    requireSessionUserMock.mockResolvedValue({ me: { id: "u1", familyId: "f1", role: "KID" } } as any);

    const req = new Request("http://localhost:3000/api/chores/undo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Missing completionId" });
  });

  it("returns success when pending completion is deleted", async () => {
    requireSessionUserMock.mockResolvedValue({ me: { id: "u1", familyId: "f1", role: "KID" } } as any);
    deleteManyMock.mockResolvedValue({ count: 1 });

    const req = new Request("http://localhost:3000/api/chores/undo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completionId: "c1" }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, status: "NOT_DONE" });
  });

  it("rejects undo after parent approval", async () => {
    requireSessionUserMock.mockResolvedValue({ me: { id: "u1", familyId: "f1", role: "KID" } } as any);
    deleteManyMock.mockResolvedValue({ count: 0 });
    findCompletionMock.mockResolvedValue({ status: "APPROVED" });

    const req = new Request("http://localhost:3000/api/chores/undo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completionId: "c1" }),
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "A parent already approved this one, so it cannot be undone.",
    });
  });
});
