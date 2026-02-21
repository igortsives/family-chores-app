import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}));

import { getToken } from "next-auth/jwt";
import { middleware } from "@/middleware";

const getTokenMock = vi.mocked(getToken);

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = "test-secret";
  });

  it("passes through routes other than /app", async () => {
    const req = new NextRequest("http://localhost:3000/app/admin/stats");
    const res = await middleware(req);

    expect(res.headers.get("location")).toBeNull();
    expect(getTokenMock).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated /app requests to /login", async () => {
    getTokenMock.mockResolvedValueOnce(null);
    const req = new NextRequest("http://localhost:3000/app");
    const res = await middleware(req);

    expect(getTokenMock).toHaveBeenCalledWith({
      req,
      secret: "test-secret",
    });
    expect(res.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("redirects adults from /app to /app/admin/stats", async () => {
    getTokenMock.mockResolvedValueOnce({ role: "ADULT" });
    const req = new NextRequest("http://localhost:3000/app");
    const res = await middleware(req);

    expect(res.headers.get("location")).toBe("http://localhost:3000/app/admin/stats");
  });

  it("redirects kids from /app to /app/my-chores", async () => {
    getTokenMock.mockResolvedValueOnce({ role: "KID" });
    const req = new NextRequest("http://localhost:3000/app");
    const res = await middleware(req);

    expect(res.headers.get("location")).toBe("http://localhost:3000/app/my-chores");
  });
});
