import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const authorize = (authOptions.providers[0] as any).options.authorize as (credentials?: Record<string, unknown>) => Promise<unknown>;
const compareMock = vi.mocked((bcrypt as any).compare);
const findUserMock = vi.mocked(prisma.user.findUnique as any);
const updateUserMock = vi.mocked(prisma.user.update as any);

describe("auth credentials provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when credentials are missing", async () => {
    const out = await authorize({ username: "", password: "" });
    expect(out).toBeNull();
    expect(findUserMock).not.toHaveBeenCalled();
    expect(compareMock).not.toHaveBeenCalled();
  });

  it("normalizes username and authenticates active visible users", async () => {
    findUserMock.mockResolvedValue({
      id: "u1",
      username: "kid1",
      email: "kid1@example.com",
      name: "Kid 1",
      role: "KID",
      familyId: "fam1",
      passwordHash: "hash1",
      isActive: true,
      isHidden: false,
    });
    compareMock.mockResolvedValue(true);
    updateUserMock.mockResolvedValue({ id: "u1" });

    const out = await authorize({ username: "  KiD1  ", password: "kid1234" }) as any;

    expect(findUserMock).toHaveBeenCalledWith({
      where: { username: "kid1" },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        familyId: true,
        passwordHash: true,
        isActive: true,
        isHidden: true,
      },
    });
    expect(compareMock).toHaveBeenCalledWith("kid1234", "hash1");
    expect(updateUserMock).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { lastLoginAt: expect.any(Date) },
    });
    expect(out).toMatchObject({
      id: "u1",
      username: "kid1",
      role: "KID",
      familyId: "fam1",
    });
  });

  it("returns null for wrong password", async () => {
    findUserMock.mockResolvedValue({
      id: "u1",
      username: "kid1",
      email: "kid1@example.com",
      name: "Kid 1",
      role: "KID",
      familyId: "fam1",
      passwordHash: "hash1",
      isActive: true,
      isHidden: false,
    });
    compareMock.mockResolvedValue(false);

    const out = await authorize({ username: "kid1", password: "wrong" });
    expect(out).toBeNull();
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("rejects inactive users before password check", async () => {
    findUserMock.mockResolvedValue({
      id: "u1",
      username: "kid1",
      email: "kid1@example.com",
      name: "Kid 1",
      role: "KID",
      familyId: "fam1",
      passwordHash: "hash1",
      isActive: false,
      isHidden: false,
    });

    const out = await authorize({ username: "kid1", password: "kid1234" });
    expect(out).toBeNull();
    expect(compareMock).not.toHaveBeenCalled();
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("rejects hidden users before password check", async () => {
    findUserMock.mockResolvedValue({
      id: "u1",
      username: "kid1",
      email: "kid1@example.com",
      name: "Kid 1",
      role: "KID",
      familyId: "fam1",
      passwordHash: "hash1",
      isActive: true,
      isHidden: true,
    });

    const out = await authorize({ username: "kid1", password: "kid1234" });
    expect(out).toBeNull();
    expect(compareMock).not.toHaveBeenCalled();
    expect(updateUserMock).not.toHaveBeenCalled();
  });
});

describe("auth callbacks", () => {
  it("maps user fields into JWT token", async () => {
    const out = await authOptions.callbacks!.jwt!({
      token: {},
      user: {
        id: "u1",
        username: "kid1",
        role: "KID",
        familyId: "fam1",
        email: "kid1@example.com",
        name: "Kid 1",
      },
    } as any);

    expect(out).toMatchObject({
      uid: "u1",
      username: "kid1",
      role: "KID",
      familyId: "fam1",
      email: "kid1@example.com",
      name: "Kid 1",
    });
  });

  it("maps JWT fields onto session.user", async () => {
    const session = { user: { name: "Old" } };
    const out = await authOptions.callbacks!.session!({
      session,
      token: {
        uid: "u1",
        username: "kid1",
        role: "KID",
        familyId: "fam1",
        email: "kid1@example.com",
        name: "Kid 1",
      },
    } as any);

    expect((out.user as any)).toMatchObject({
      id: "u1",
      username: "kid1",
      role: "KID",
      familyId: "fam1",
      email: "kid1@example.com",
      name: "Kid 1",
    });
  });

  it("redirects external urls to app home", async () => {
    const cb = authOptions.callbacks!.redirect!;
    await expect(cb({ url: "/app/my-chores", baseUrl: "http://localhost:3000" } as any))
      .resolves.toBe("http://localhost:3000/app/my-chores");
    await expect(cb({ url: "https://evil.example/path", baseUrl: "http://localhost:3000" } as any))
      .resolves.toBe("http://localhost:3000/app");
  });
});
