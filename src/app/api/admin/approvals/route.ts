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

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const [pending, rejected, activityRows, dueInstances] = await Promise.all([
    prisma.choreCompletion.findMany({
      where: { status: "PENDING", choreInstance: { familyId: me.familyId } },
      select: {
        id: true,
        status: true,
        completedAt: true,
        pointsEarned: true,
        rejectionReason: true,
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
    }),
    prisma.choreCompletion.findMany({
      where: { status: "REJECTED", choreInstance: { familyId: me.familyId } },
      select: {
        id: true,
        status: true,
        completedAt: true,
        pointsEarned: true,
        rejectionReason: true,
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
    }),
    prisma.choreCompletion.findMany({
      where: { choreInstance: { familyId: me.familyId } },
      select: {
        id: true,
        status: true,
        completedAt: true,
        approvedAt: true,
        pointsEarned: true,
        rejectionReason: true,
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
      take: 500,
    }),
    prisma.choreInstance.findMany({
      where: { familyId: me.familyId, dueDate: { lte: endOfToday } },
      select: {
        id: true,
        dueDate: true,
        chore: {
          select: {
            id: true,
            title: true,
            points: true,
            assignments: {
              select: {
                user: { select: { id: true, name: true, email: true, role: true } },
              },
            },
          },
        },
        completions: {
          select: { userId: true },
        },
      },
      orderBy: { dueDate: "desc" },
      take: 500,
    }),
  ]);
  const rejectedKeys = activityRows.map((row) => `completion-${row.id}-rejected`);
  const rejectionNotifications =
    rejectedKeys.length > 0
      ? await prisma.notification.findMany({
          where: { sourceKey: { in: rejectedKeys } },
          select: { sourceKey: true, createdAt: true },
        })
      : [];
  const rejectionDateByCompletionId = new Map<string, Date>();
  for (const n of rejectionNotifications) {
    const sourceKey = n.sourceKey ?? "";
    const match = /^completion-(.+)-rejected$/.exec(sourceKey);
    if (!match) continue;
    const completionId = match[1];
    const existing = rejectionDateByCompletionId.get(completionId);
    if (!existing || n.createdAt > existing) {
      rejectionDateByCompletionId.set(completionId, n.createdAt);
    }
  }

  const dueNotCompleted = dueInstances.flatMap((instance) => {
    const completedUserIds = new Set(instance.completions.map((c) => c.userId));
    return instance.chore.assignments
      .map((a) => a.user)
      .filter((user) => user.role === "KID")
      .filter((user) => !completedUserIds.has(user.id))
      .map((user) => ({
        id: `due-${instance.id}-${user.id}`,
        status: "DUE" as const,
        completedAt: null,
        approvedAt: null,
        pointsEarned: instance.chore.points,
        parentComment: null,
        rejectionDate: null,
        kid: { id: user.id, name: user.name, email: user.email },
        chore: { id: instance.chore.id, title: instance.chore.title, points: instance.chore.points },
        dueDate: instance.dueDate,
      }));
  });

  const completionActivity = activityRows.map((p) => ({
    id: p.id,
    status: p.status,
    completedAt: p.completedAt,
    approvedAt: p.approvedAt,
    pointsEarned: p.pointsEarned,
    parentComment: p.rejectionReason ?? null,
    rejectionDate: rejectionDateByCompletionId.get(p.id) ?? null,
    kid: { id: p.user.id, name: p.user.name, email: p.user.email },
    chore: { id: p.choreInstance.chore.id, title: p.choreInstance.chore.title, points: p.choreInstance.chore.points },
    dueDate: p.choreInstance.dueDate,
  }));

  const allActivity = [...completionActivity, ...dueNotCompleted].sort((a, b) => {
    const aTime = (a.completedAt ? new Date(a.completedAt).getTime() : new Date(a.dueDate).getTime()) || 0;
    const bTime = (b.completedAt ? new Date(b.completedAt).getTime() : new Date(b.dueDate).getTime()) || 0;
    return bTime - aTime;
  });

  return NextResponse.json({
    pending: pending.map((p) => ({
      id: p.id,
      status: p.status,
      completedAt: p.completedAt,
      pointsEarned: p.pointsEarned,
      parentComment: p.rejectionReason ?? null,
      rejectionDate: null,
      kid: { id: p.user.id, name: p.user.name, email: p.user.email },
      chore: { id: p.choreInstance.chore.id, title: p.choreInstance.chore.title, points: p.choreInstance.chore.points },
      dueDate: p.choreInstance.dueDate,
    })),
    rejected: rejected.map((p) => ({
      id: p.id,
      status: p.status,
      completedAt: p.completedAt,
      pointsEarned: p.pointsEarned,
      parentComment: p.rejectionReason ?? null,
      rejectionDate: rejectionDateByCompletionId.get(p.id) ?? null,
      kid: { id: p.user.id, name: p.user.name, email: p.user.email },
      chore: { id: p.choreInstance.chore.id, title: p.choreInstance.chore.title, points: p.choreInstance.chore.points },
      dueDate: p.choreInstance.dueDate,
    })),
    activity: allActivity,
  });
}

export async function POST(req: Request) {
  const auth = await requireAdult({ source: "api/admin/approvals.POST" });
  if ("status" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { me } = auth;

  const body = await req.json().catch(() => ({}));
  const completionId = String(body?.completionId ?? "");
  const action = String(body?.action ?? ""); // "APPROVE" | "REJECT"
  const parentComment = String(body?.parentComment ?? body?.rejectionReason ?? "").trim();
  if (!completionId) return NextResponse.json({ error: "Missing completionId" }, { status: 400 });
  if (action !== "APPROVE" && action !== "REJECT") return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  if (action === "REJECT" && !parentComment) {
    return NextResponse.json({ error: "Comment is required when rejecting" }, { status: 400 });
  }
  if (parentComment.length > 500) {
    return NextResponse.json({ error: "Comment is too long" }, { status: 400 });
  }

  const completion = await prisma.choreCompletion.findFirst({
    where: {
      id: completionId,
      status: action === "APPROVE" ? { in: ["PENDING", "REJECTED"] } : "PENDING",
      choreInstance: { familyId: me.familyId },
    },
    select: {
      id: true,
      userId: true,
      status: true,
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
        rejectionReason: parentComment || null,
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
      message: parentComment
        ? `Nice work! Your parent approved this chore. Parent note: ${parentComment}`
        : "Nice work! Your parent approved this chore.",
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
      rejectionReason: parentComment,
    },
  });

  await createNotification({
    userId: completion.userId,
    sourceKey: `completion-${completionId}-rejected`,
    kind: "UPDATE",
    severity: "ERROR",
    title: "Please try again",
    message: `Parent note: ${parentComment}`,
    href: "/app/my-chores",
  });

  await Promise.all([
    syncKidReminderNotifications(completion.userId, me.familyId),
    syncAdultReminderNotificationsForFamily(me.familyId),
  ]);

  return NextResponse.json({ ok: true, status: "REJECTED" });
}

export async function PATCH(req: Request) {
  const auth = await requireAdult({ source: "api/admin/approvals.PATCH" });
  if ("status" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { me } = auth;

  const body = await req.json().catch(() => ({}));
  const completionId = String(body?.completionId ?? "").trim();
  const parentComment = String(body?.parentComment ?? "").trim();

  if (!completionId) {
    return NextResponse.json({ error: "Missing completionId" }, { status: 400 });
  }
  if (parentComment.length > 500) {
    return NextResponse.json({ error: "Comment is too long" }, { status: 400 });
  }

  const completion = await prisma.choreCompletion.findFirst({
    where: {
      id: completionId,
      choreInstance: { familyId: me.familyId },
    },
    select: { id: true, status: true },
  });
  if (!completion) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Parent comments are stored in `rejectionReason` for both approved and rejected lifecycle notes.
  const updated = await prisma.choreCompletion.update({
    where: { id: completionId },
    data: { rejectionReason: parentComment || null },
    select: { id: true, rejectionReason: true },
  });

  return NextResponse.json({
    ok: true,
    id: updated.id,
    parentComment: updated.rejectionReason ?? null,
  });
}
