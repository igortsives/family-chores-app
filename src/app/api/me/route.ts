import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/requireUser";

export async function GET() {
  const auth = await requireSessionUser({ source: "api/me.GET" });
  if ("status" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { me } = auth;
  return NextResponse.json({
    me: {
      id: me.id,
      role: me.role,
      familyId: me.familyId,
      username: me.username,
      name: me.name,
      email: me.email,
      avatarUrl: me.avatarUrl,
    },
  });
}
