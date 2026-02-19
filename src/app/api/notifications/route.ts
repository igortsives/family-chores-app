import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/requireUser";
import {
  dismissNotification,
  getUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
  syncUserReminderNotifications,
} from "@/lib/notifications";

export async function GET() {
  const auth = await requireSessionUser();
  if ("status" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { me } = auth;

  await syncUserReminderNotifications({
    userId: me.id,
    familyId: me.familyId,
    role: me.role,
  });

  const { items, unreadCount } = await getUserNotifications(me.id);

  return NextResponse.json({
    items,
    unreadCount,
    generatedAt: new Date().toISOString(),
  });
}

export async function PATCH(req: Request) {
  const auth = await requireSessionUser();
  if ("status" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { me } = auth;

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "").toUpperCase();
  const id = String(body?.id ?? "");

  if (action === "READ_ALL") {
    await markAllNotificationsRead(me.id);
    const { unreadCount } = await getUserNotifications(me.id);
    return NextResponse.json({ ok: true, unreadCount });
  }

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  if (action === "READ") {
    await markNotificationRead(me.id, id);
  } else if (action === "UNREAD") {
    await markNotificationUnread(me.id, id);
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { unreadCount } = await getUserNotifications(me.id);
  return NextResponse.json({ ok: true, unreadCount });
}

export async function DELETE(req: Request) {
  const auth = await requireSessionUser();
  if ("status" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { me } = auth;

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await dismissNotification(me.id, id);
  const { unreadCount } = await getUserNotifications(me.id);
  return NextResponse.json({ ok: true, unreadCount });
}
