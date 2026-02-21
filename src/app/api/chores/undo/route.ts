import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncAdultReminderNotificationsForFamily, syncKidReminderNotifications } from "@/lib/notifications";
import { requireSessionUser } from "@/lib/requireUser";

export async function POST(req: Request) {
  const auth = await requireSessionUser({ source: "api/chores/undo.POST" });
  if ("status" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { me: user } = auth;
  if (user.role !== "KID") return NextResponse.json({ error: "Only kids can undo completion" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const completionId = String(body?.completionId ?? "").trim();
  if (!completionId) return NextResponse.json({ error: "Missing completionId" }, { status: 400 });

  const deleted = await prisma.choreCompletion.deleteMany({
    where: {
      id: completionId,
      userId: user.id,
      status: "PENDING",
      choreInstance: { familyId: user.familyId },
    },
  });
  if (deleted.count > 0) {
    await Promise.all([
      syncKidReminderNotifications(user.id, user.familyId),
      syncAdultReminderNotificationsForFamily(user.familyId),
    ]);
    return NextResponse.json({ ok: true, status: "NOT_DONE" });
  }

  const completion = await prisma.choreCompletion.findFirst({
    where: {
      id: completionId,
      userId: user.id,
      choreInstance: { familyId: user.familyId },
    },
    select: { status: true },
  });
  if (!completion) return NextResponse.json({ error: "Completion not found" }, { status: 404 });
  if (completion.status === "APPROVED") {
    return NextResponse.json({ error: "A parent already approved this one, so it cannot be undone." }, { status: 400 });
  }
  if (completion.status !== "PENDING") {
    return NextResponse.json({ error: "You can undo only while it says waiting for parent." }, { status: 400 });
  }

  return NextResponse.json({ error: "Unable to undo completion" }, { status: 409 });
}
