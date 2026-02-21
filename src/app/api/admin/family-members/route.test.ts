import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/requireUser", () => ({
  requireAdult: vi.fn(),
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
import { requireAdult } from "@/lib/requireUser";
import { prisma } from "@/lib/prisma";
import { GET, POST, PUT } from "@/app/api/admin/family-members/route";

const requireAdultMock = vi.mocked(requireAdult);
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
    requireAdultMock.mockResolvedValue({ status: 401, error: "Unauthorized" } as any);

    const res = await GET();

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("GET includes lastLoginAt in family member payload", async () => {
    requireAdultMock.mockResolvedValue({ me: { id: "adult-1", familyId: "fam-1", role: "ADULT" } } as any);
    findManyMock.mockResolvedValue([
      {
        id: "kid-1",
        username: "kid1",
        email: "kid1@example.com",
        name: "Kid One",
        avatarUrl: null,
        role: "KID",
        isActive: true,
        isHidden: false,
        createdAt: new Date("2026-02-20T10:00:00.000Z"),
        lastLoginAt: new Date("2026-02-21T18:45:00.000Z"),
      },
    ]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          lastLoginAt: true,
        }),
      }),
    );
    const json = await res.json();
    expect(json.members[0].lastLoginAt).toBe("2026-02-21T18:45:00.000Z");
  });

  it("POST returns 400 for oversized avatar payload", async () => {
    requireAdultMock.mockResolvedValue({ me: { id: "adult-1", familyId: "fam-1", role: "ADULT" } } as any);

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
    requireAdultMock.mockResolvedValue({ me: { id: "adult-1", familyId: "fam-1", role: "ADULT" } } as any);
    findUniqueMock.mockResolvedValueOnce(null);
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
    requireAdultMock.mockResolvedValue({ me: { id: "adult-1", familyId: "fam-1", role: "ADULT" } } as any);
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
