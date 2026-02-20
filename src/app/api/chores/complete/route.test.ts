import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    chore: { findFirst: vi.fn() },
    choreInstance: { findFirst: vi.fn(), create: vi.fn() },
    choreCompletion: { findFirst: vi.fn(), create: vi.fn() },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/chores/complete/route";

const getServerSessionMock = vi.mocked(getServerSession);
const findUserMock = vi.mocked(prisma.user.findUnique as any);
const findChoreMock = vi.mocked(prisma.chore.findFirst as any);
const findInstanceMock = vi.mocked(prisma.choreInstance.findFirst as any);
const createInstanceMock = vi.mocked(prisma.choreInstance.create as any);
const findCompletionMock = vi.mocked(prisma.choreCompletion.findFirst as any);
const createCompletionMock = vi.mocked(prisma.choreCompletion.create as any);

describe("POST /api/chores/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no authenticated email is present", async () => {
    getServerSessionMock.mockResolvedValue({ user: {} } as any);

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
    getServerSessionMock.mockResolvedValue({ user: { email: "kid@example.com" } } as any);
    findUserMock.mockResolvedValue({ id: "u1", familyId: "f1", role: "KID" });
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
    getServerSessionMock.mockResolvedValue({ user: { email: "kid@example.com" } } as any);
    findUserMock.mockResolvedValue({ id: "u1", familyId: "f1", role: "KID" });
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

  it("auto-approves completion for adult users", async () => {
    getServerSessionMock.mockResolvedValue({ user: { email: "adult@example.com" } } as any);
    findUserMock.mockResolvedValue({ id: "u2", familyId: "f1", role: "ADULT" });
    findChoreMock.mockResolvedValue({ id: "c1", points: 2, familyId: "f1" });
    findInstanceMock.mockResolvedValueOnce(null);
    createInstanceMock.mockResolvedValue({ id: "i1" });
    findCompletionMock.mockResolvedValue(null);
    createCompletionMock.mockResolvedValue({ id: "cmp-adult", status: "APPROVED" });

    const req = new Request("http://localhost:3000/api/chores/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ choreId: "c1" }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, completionId: "cmp-adult", status: "APPROVED" });
    expect(createCompletionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "u2",
          status: "APPROVED",
          approvedById: "u2",
        }),
      }),
    );
  });
});
