import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/requireUser";
import { getUnreadNotificationCount } from "@/lib/notifications";

export async function GET() {
  const auth = await requireSessionUser({ source: "api/notifications/unread.GET" });
  if ("status" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const unreadCount = await getUnreadNotificationCount(auth.me.id);
  return NextResponse.json({ unreadCount });
}
