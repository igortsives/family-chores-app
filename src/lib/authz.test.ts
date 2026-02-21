import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/requireUser", () => ({
  requireAdult: vi.fn(),
  requireSessionUser: vi.fn(),
}));

import { requireAdult as requireAdultGuard, requireSessionUser } from "@/lib/requireUser";
import { requireAdult, requireSession } from "@/lib/authz";

const requireAdultGuardMock = vi.mocked(requireAdultGuard);
const requireSessionUserMock = vi.mocked(requireSessionUser);

describe("authz guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws UNAUTHORIZED without session user", async () => {
    requireSessionUserMock.mockResolvedValue({ status: 401, error: "Unauthorized" } as any);
    await expect(requireSession()).rejects.toThrow("UNAUTHORIZED");
  });

  it("throws FORBIDDEN when user role is KID", async () => {
    requireAdultGuardMock.mockResolvedValue({ status: 403, error: "Forbidden" } as any);
    await expect(requireAdult()).rejects.toThrow("FORBIDDEN");
  });

  it("returns session for ADULT role", async () => {
    requireAdultGuardMock.mockResolvedValue({
      me: { id: "adult-1", role: "ADULT", familyId: "fam-1", username: "parent", name: "Parent" },
    } as any);
    await expect(requireAdult()).resolves.toEqual({
      user: { id: "adult-1", role: "ADULT", familyId: "fam-1", username: "parent", name: "Parent" },
    });
  });
});
