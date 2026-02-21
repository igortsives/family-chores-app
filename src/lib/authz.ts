import { requireAdult as requireAdultGuard, requireSessionUser } from "@/lib/requireUser";

export async function requireSession() {
  const auth = await requireSessionUser({ source: "lib/authz.requireSession", logOutcome: false });
  if ("status" in auth) throw new Error("UNAUTHORIZED");
  return { user: auth.me } as any;
}

export async function requireAdult() {
  const auth = await requireAdultGuard({ source: "lib/authz.requireAdult" });
  if ("status" in auth) {
    if (auth.status === 401) throw new Error("UNAUTHORIZED");
    if (auth.status === 403) throw new Error("FORBIDDEN");
    throw new Error("UNAUTHORIZED");
  }
  return { user: auth.me } as any;
}
