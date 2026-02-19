import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { requireAdult, requireSession } from "@/lib/authz";

const getServerSessionMock = vi.mocked(getServerSession);

describe("authz guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws UNAUTHORIZED without session user", async () => {
    getServerSessionMock.mockResolvedValue(null as any);
    await expect(requireSession()).rejects.toThrow("UNAUTHORIZED");
  });

  it("throws FORBIDDEN when user role is KID", async () => {
    getServerSessionMock.mockResolvedValue({ user: { role: "KID" } } as any);
    await expect(requireAdult()).rejects.toThrow("FORBIDDEN");
  });

  it("returns session for ADULT role", async () => {
    const session = { user: { role: "ADULT" } };
    getServerSessionMock.mockResolvedValue(session as any);
    await expect(requireAdult()).resolves.toEqual(session);
  });
});
