import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createNotification,
  syncAdultReminderNotificationsForFamily,
  syncKidReminderNotifications,
} from "@/lib/notifications";
import { requireAdult } from "@/lib/requireUser";

export async function GET() {
  const auth = await requireAdult({ source: "api/admin/approvals.GET" });
  if ("status" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { me } = auth;

  const pending = await prisma.choreCompletion.findMany({
    where: { status: "PENDING", choreInstance: { familyId: me.familyId } },
    select: {
      id: true,
      status: true,
      completedAt: true,
      pointsEarned: true,
      user: { select: { id: true, name: true, email: true, role: true } },
      choreInstance: {
        select: {
          id: true,
          dueDate: true,
          chore: { select: { id: true, title: true, points: true } },
        },
      },
    },
    orderBy: { completedAt: "desc" },
    take: 200,
  });

  return NextResponse.json({
    pending: pending.map((p) => ({
      id: p.id,
      completedAt: p.completedAt,
      pointsEarned: p.pointsEarned,
      kid: { id: p.user.id, name: p.user.name, email: p.user.email },
      chore: { id: p.choreInstance.chore.id, title: p.choreInstance.chore.title, points: p.choreInstance.chore.points },
      dueDate: p.choreInstance.dueDate,
    })),
  });
}

export async function POST(req: Request) {
  const auth = await requireAdult({ source: "api/admin/approvals.POST" });
  if ("status" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { me } = auth;

  const body = await req.json().catch(() => ({}));
  const completionId = String(body?.completionId ?? "");
  const action = String(body?.action ?? ""); // "APPROVE" | "REJECT"
  const rejectionReason = String(body?.rejectionReason ?? "").trim();
  if (!completionId) return NextResponse.json({ error: "Missing completionId" }, { status: 400 });
  if (action !== "APPROVE" && action !== "REJECT") return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  if (action === "REJECT" && !rejectionReason) {
    return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });
  }
  if (rejectionReason.length > 500) {
    return NextResponse.json({ error: "Rejection reason is too long" }, { status: 400 });
  }

  const completion = await prisma.choreCompletion.findFirst({
    where: { id: completionId, status: "PENDING", choreInstance: { familyId: me.familyId } },
    select: {
      id: true,
      userId: true,
      user: { select: { role: true } },
    },
  });
  if (!completion) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "APPROVE") {
    const updated = await prisma.choreCompletion.update({
      where: { id: completionId },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedBy: { connect: { id: me.id } },
        rejectionReason: null,
      },
    });

    if (completion.user.role === "KID") {
      const totals = await prisma.choreCompletion.aggregate({
        where: { userId: completion.userId, status: "APPROVED" },
        _sum: { pointsEarned: true },
      });
      const totalPoints = totals._sum.pointsEarned ?? 0;

      const awards = await prisma.award.findMany({
        where: { familyId: me.familyId },
        select: { id: true, thresholdPoints: true },
      });

      const existing = await prisma.userAward.findMany({
        where: { userId: completion.userId },
        select: { awardId: true },
      });
      const existingIds = new Set(existing.map((a) => a.awardId));
      const toGrant = awards.filter((a) => totalPoints >= a.thresholdPoints && !existingIds.has(a.id));

      if (toGrant.length > 0) {
        await prisma.userAward.createMany({
          data: toGrant.map((a) => ({
            userId: completion.userId,
            awardId: a.id,
            completionId: updated.id,
          })),
          skipDuplicates: true,
        });
      }
    }

    await createNotification({
      userId: completion.userId,
      sourceKey: `completion-${completionId}-approved`,
      kind: "UPDATE",
      severity: "SUCCESS",
      title: "Great job! Approved",
      message: "Nice work! Your parent approved this chore.",
      href: "/app/my-chores",
    });

    await Promise.all([
      syncKidReminderNotifications(completion.userId, me.familyId),
      syncAdultReminderNotificationsForFamily(me.familyId),
    ]);

    return NextResponse.json({ ok: true, status: "APPROVED" });
  }

  // REJECT (schema may not have rejectedBy / rejectedAt, so keep it minimal)
  await prisma.choreCompletion.update({
    where: { id: completionId },
    data: {
      status: "REJECTED",
      // If approval fields exist, clear them.
      approvedAt: null,
      approvedBy: { disconnect: true },
      rejectionReason,
    },
  });

  await createNotification({
    userId: completion.userId,
    sourceKey: `completion-${completionId}-rejected`,
    kind: "UPDATE",
    severity: "ERROR",
    title: "Please try again",
    message: `Parent note: ${rejectionReason}`,
    href: "/app/my-chores",
  });

  await Promise.all([
    syncKidReminderNotifications(completion.userId, me.familyId),
    syncAdultReminderNotificationsForFamily(me.familyId),
  ]);

  return NextResponse.json({ ok: true, status: "REJECTED" });
}
