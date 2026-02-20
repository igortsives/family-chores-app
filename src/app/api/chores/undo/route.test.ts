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
    choreCompletion: { deleteMany: vi.fn(), findFirst: vi.fn() },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/chores/undo/route";

const getServerSessionMock = vi.mocked(getServerSession);
const findUserMock = vi.mocked(prisma.user.findUnique as any);
const deleteManyMock = vi.mocked(prisma.choreCompletion.deleteMany as any);
const findCompletionMock = vi.mocked(prisma.choreCompletion.findFirst as any);

describe("POST /api/chores/undo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 for non-kid users", async () => {
    getServerSessionMock.mockResolvedValue({ user: { email: "adult@example.com" } } as any);
    findUserMock.mockResolvedValue({ id: "u1", familyId: "f1", role: "ADULT" });

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
    getServerSessionMock.mockResolvedValue({ user: { email: "kid@example.com" } } as any);
    findUserMock.mockResolvedValue({ id: "u1", familyId: "f1", role: "KID" });

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
    getServerSessionMock.mockResolvedValue({ user: { email: "kid@example.com" } } as any);
    findUserMock.mockResolvedValue({ id: "u1", familyId: "f1", role: "KID" });
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
    getServerSessionMock.mockResolvedValue({ user: { email: "kid@example.com" } } as any);
    findUserMock.mockResolvedValue({ id: "u1", familyId: "f1", role: "KID" });
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
