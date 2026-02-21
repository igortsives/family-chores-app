import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncAdultReminderNotificationsForFamily, syncKidReminderNotifications } from "@/lib/notifications";
import { requireSessionUser } from "@/lib/requireUser";

export async function POST(req: Request) {
  const auth = await requireSessionUser({ source: "api/chores/complete.POST" });
  if ("status" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { me: user } = auth;
  if (user.role !== "KID") {
    return NextResponse.json({ error: "Only kids can complete chores" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const choreId: string | undefined = body?.choreId;
  const instanceId: string | null | undefined = body?.instanceId;

  if (!choreId) return NextResponse.json({ error: "Missing choreId" }, { status: 400 });

  // Ensure chore belongs to family and user is assigned
  const chore = await prisma.chore.findFirst({
    where: {
      id: choreId,
      familyId: user.familyId,
      active: true,
      assignments: { some: { userId: user.id } },
    },
    select: { id: true, points: true, familyId: true },
  });
  if (!chore) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Determine "today"
  const now = new Date();
  const start = new Date(now); start.setHours(0,0,0,0);
  const end = new Date(now); end.setHours(23,59,59,999);

  // Use existing instance if provided and valid; else find/create today's instance.
  let inst = null as null | { id: string };
  if (instanceId) {
    const found = await prisma.choreInstance.findFirst({
      where: { id: instanceId, choreId: chore.id, familyId: user.familyId, dueDate: { gte: start, lte: end } },
      select: { id: true },
    });
    if (found) inst = found;
  }
  if (!inst) {
    const existing = await prisma.choreInstance.findFirst({
      where: { choreId: chore.id, familyId: user.familyId, dueDate: { gte: start, lte: end } },
      select: { id: true },
    });
    if (existing) inst = existing;
    else {
      inst = await prisma.choreInstance.create({
        data: { choreId: chore.id, familyId: user.familyId, dueDate: now },
        select: { id: true },
      });
    }
  }

  // Kids submit completions for parent approval.
  const status = "PENDING";

  // If already completed today with PENDING/APPROVED, return current status.
  // If latest status is REJECTED, allow a new submission.
  const existingCompletion = await prisma.choreCompletion.findFirst({
    where: { choreInstanceId: inst.id, userId: user.id },
    orderBy: { completedAt: "desc" },
    select: { id: true, status: true },
  });
  if (existingCompletion && existingCompletion.status !== "REJECTED") {
    return NextResponse.json({ ok: true, completionId: existingCompletion.id, status: existingCompletion.status });
  }

  const completion = await prisma.choreCompletion.create({
    data: {
      choreInstanceId: inst.id,
      userId: user.id,
      status,
      pointsEarned: chore.points,
    },
    select: { id: true, status: true },
  });

  await Promise.all([
    syncKidReminderNotifications(user.id, user.familyId),
    syncAdultReminderNotificationsForFamily(user.familyId),
  ]);

  return NextResponse.json({ ok: true, completionId: completion.id, status: completion.status });
}
