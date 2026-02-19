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

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/my-chores/route";

const getServerSessionMock = vi.mocked(getServerSession);
const findUserMock = vi.mocked(prisma.user.findUnique as any);

describe("GET /api/my-chores auth guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session has no email", async () => {
    getServerSessionMock.mockResolvedValue({ user: {} } as any);

    const res = await GET();
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(findUserMock).not.toHaveBeenCalled();
  });

  it("returns 401 when user lookup by email is missing", async () => {
    getServerSessionMock.mockResolvedValue({ user: { email: "missing@example.com" } } as any);
    findUserMock.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
  });
});
