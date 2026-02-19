import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
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
import { requireAdult, requireSessionUser } from "@/lib/requireUser";

const getServerSessionMock = vi.mocked(getServerSession);
const findUserMock = vi.mocked(prisma.user.findUnique as any);

describe("requireUser guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session has no uid", async () => {
    getServerSessionMock.mockResolvedValue({ user: { email: "kid1@example.com" } } as any);

    await expect(requireSessionUser()).resolves.toEqual({ status: 401, error: "Unauthorized" });
    expect(findUserMock).not.toHaveBeenCalled();
  });

  it("returns 401 when uid is unknown", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "u1" } } as any);
    findUserMock.mockResolvedValue(null);

    await expect(requireSessionUser()).resolves.toEqual({ status: 401, error: "Unauthorized" });
  });

  it("returns me when session uid exists", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "u1" } } as any);
    findUserMock.mockResolvedValue({
      id: "u1",
      role: "KID",
      familyId: "fam1",
      username: "kid1",
      name: "Kid 1",
    });

    await expect(requireSessionUser()).resolves.toEqual({
      me: {
        id: "u1",
        role: "KID",
        familyId: "fam1",
        username: "kid1",
        name: "Kid 1",
      },
    });
  });

  it("requireAdult returns 403 for kids", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "u1" } } as any);
    findUserMock.mockResolvedValue({
      id: "u1",
      role: "KID",
      familyId: "fam1",
      username: "kid1",
      name: "Kid 1",
    });

    await expect(requireAdult()).resolves.toEqual({ status: 403, error: "Forbidden" });
  });

  it("requireAdult passes for adults", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "u1" } } as any);
    findUserMock.mockResolvedValue({
      id: "u1",
      role: "ADULT",
      familyId: "fam1",
      username: "parent",
      name: "Parent",
    });

    await expect(requireAdult()).resolves.toEqual({
      me: {
        id: "u1",
        role: "ADULT",
        familyId: "fam1",
        username: "parent",
        name: "Parent",
      },
    });
  });
});
