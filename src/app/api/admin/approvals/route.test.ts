import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/notifications", () => ({
  createNotification: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/admin/approvals/route";

const getServerSessionMock = vi.mocked(getServerSession);
const findUserMock = vi.mocked(prisma.user.findUnique as any);

describe("admin approvals auth guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns 401 when session has no email", async () => {
    getServerSessionMock.mockResolvedValue({ user: {} } as any);

    const res = await GET();
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(findUserMock).not.toHaveBeenCalled();
  });

  it("GET returns 403 for kid role", async () => {
    getServerSessionMock.mockResolvedValue({ user: { email: "kid1@example.com" } } as any);
    findUserMock.mockResolvedValue({ id: "u1", familyId: "fam1", role: "KID" });

    const res = await GET();
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("POST returns 401 when session has no email", async () => {
    getServerSessionMock.mockResolvedValue({ user: {} } as any);

    const req = new Request("http://localhost/api/admin/approvals", {
      method: "POST",
      body: JSON.stringify({ completionId: "c1", action: "APPROVE" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
  });
});
