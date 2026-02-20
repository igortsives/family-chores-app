import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { GET, POST, PUT } from "@/app/api/admin/family-members/route";

const getServerSessionMock = vi.mocked(getServerSession);
const hashMock = vi.mocked((bcrypt as any).hash);
const findUniqueMock = vi.mocked(prisma.user.findUnique as any);
const findManyMock = vi.mocked(prisma.user.findMany as any);
const createMock = vi.mocked(prisma.user.create as any);
const findFirstMock = vi.mocked(prisma.user.findFirst as any);
const updateMock = vi.mocked(prisma.user.update as any);

describe("/api/admin/family-members", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns 401 when session user id is missing", async () => {
    getServerSessionMock.mockResolvedValue({ user: {} } as any);

    const res = await GET();

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("POST returns 400 for oversized avatar payload", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "adult-1" } } as any);
    findUniqueMock.mockResolvedValue({ id: "adult-1", familyId: "fam-1", role: "ADULT" });

    const huge = "x".repeat(2_000_001);
    const req = new Request("http://localhost:3000/api/admin/family-members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "kid1",
        email: "kid1@example.com",
        password: "kid1234",
        avatarUrl: huge,
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Profile image is too large" });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("POST normalizes and stores avatarUrl", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "adult-1" } } as any);
    findUniqueMock
      .mockResolvedValueOnce({ id: "adult-1", familyId: "fam-1", role: "ADULT" })
      .mockResolvedValueOnce(null);
    hashMock.mockResolvedValue("hash-1");
    createMock.mockResolvedValue({ id: "kid-1" });

    const req = new Request("http://localhost:3000/api/admin/family-members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "kid1",
        email: "kid1@example.com",
        password: "kid1234",
        avatarUrl: "  data:image/png;base64,abc  ",
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          avatarUrl: "data:image/png;base64,abc",
        }),
      }),
    );
  });

  it("PUT allows clearing avatar by sending blank value", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "adult-1" } } as any);
    findUniqueMock.mockResolvedValue({ id: "adult-1", familyId: "fam-1", role: "ADULT" });
    findFirstMock.mockResolvedValue({ id: "kid-1", username: "kid1" });
    updateMock.mockResolvedValue({});

    const req = new Request("http://localhost:3000/api/admin/family-members", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "kid-1",
        avatarUrl: " ",
      }),
    });

    const res = await PUT(req);

    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "kid-1" },
      data: { avatarUrl: null },
    });
  });
});
