import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/requireUser";

type NotificationItem = {
  id: string;
  kind: "REMINDER" | "UPDATE";
  severity: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
  title: string;
  message: string;
  href: string;
  createdAt: string;
};

function startOfToday() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

function endOfToday() {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return end;
}

async function adultNotifications(userId: string, familyId: string): Promise<NotificationItem[]> {
  const items: NotificationItem[] = [];
  const nowIso = new Date().toISOString();

  const pendingApprovals = await prisma.choreCompletion.count({
    where: { status: "PENDING", choreInstance: { familyId } },
  });
  if (pendingApprovals > 0) {
    items.push({
      id: "adult-pending-approvals",
      kind: "REMINDER",
      severity: "WARNING",
      title: "Pending chore approvals",
      message: `${pendingApprovals} chore ${pendingApprovals === 1 ? "needs" : "need"} your review.`,
      href: "/app/admin/approvals",
      createdAt: nowIso,
    });
  }

  const pendingExchanges = await prisma.starExchange.count({
    where: { status: "PENDING", user: { familyId } },
  });
  if (pendingExchanges > 0) {
    items.push({
      id: "adult-pending-exchanges",
      kind: "REMINDER",
      severity: "WARNING",
      title: "Pending star exchanges",
      message: `${pendingExchanges} star exchange ${pendingExchanges === 1 ? "request is" : "requests are"} awaiting approval.`,
      href: "/app/admin/stars",
      createdAt: nowIso,
    });
  }

  const reviewedExchanges = await prisma.starExchange.findMany({
    where: { reviewedById: userId, reviewedAt: { not: null } },
    orderBy: { reviewedAt: "desc" },
    take: 3,
    select: {
      id: true,
      stars: true,
      status: true,
      reviewedAt: true,
      user: { select: { name: true, username: true } },
    },
  });

  for (const ex of reviewedExchanges) {
    items.push({
      id: `adult-reviewed-${ex.id}`,
      kind: "UPDATE",
      severity: ex.status === "APPROVED" ? "SUCCESS" : "INFO",
      title: "Recent exchange decision",
      message: `${ex.status === "APPROVED" ? "Approved" : "Rejected"} ${ex.stars}⭐ for ${ex.user.name || ex.user.username || "kid"}.`,
      href: "/app/admin/stars",
      createdAt: (ex.reviewedAt ?? new Date()).toISOString(),
    });
  }

  return items;
}

async function kidNotifications(userId: string, familyId: string): Promise<NotificationItem[]> {
  const items: NotificationItem[] = [];
  const nowIso = new Date().toISOString();
  const start = startOfToday();
  const end = endOfToday();

  const chores = await prisma.chore.findMany({
    where: {
      familyId,
      active: true,
      assignments: { some: { userId } },
    },
    select: { id: true },
  });

  if (chores.length > 0) {
    const instances = await prisma.choreInstance.findMany({
      where: {
        familyId,
        choreId: { in: chores.map((c) => c.id) },
        dueDate: { gte: start, lte: end },
      },
      select: {
        choreId: true,
        completions: {
          where: { userId },
          select: { status: true, completedAt: true },
          orderBy: { completedAt: "desc" },
          take: 1,
        },
      },
    });

    const byChore: Record<string, "NOT_DONE" | "PENDING" | "APPROVED" | "REJECTED"> = {};
    for (const c of chores) byChore[c.id] = "NOT_DONE";
    for (const inst of instances) {
      const s = inst.completions[0]?.status;
      byChore[inst.choreId] = s === "PENDING" || s === "APPROVED" || s === "REJECTED" ? s : "NOT_DONE";
    }

    const statuses = Object.values(byChore);
    const notDone = statuses.filter((s) => s === "NOT_DONE").length;
    const pending = statuses.filter((s) => s === "PENDING").length;
    const rejected = statuses.filter((s) => s === "REJECTED").length;

    if (rejected > 0) {
      items.push({
        id: "kid-rejected",
        kind: "REMINDER",
        severity: "ERROR",
        title: "Chores need attention",
        message: `${rejected} chore ${rejected === 1 ? "was" : "were"} rejected. Update and mark done again.`,
        href: "/app/my-chores",
        createdAt: nowIso,
      });
    }

    if (notDone > 0) {
      items.push({
        id: "kid-not-done",
        kind: "REMINDER",
        severity: "WARNING",
        title: "Today's chores remaining",
        message: `${notDone} chore ${notDone === 1 ? "is" : "are"} still not done today.`,
        href: "/app/my-chores",
        createdAt: nowIso,
      });
    }

    if (pending > 0) {
      items.push({
        id: "kid-pending-approvals",
        kind: "UPDATE",
        severity: "INFO",
        title: "Waiting for parent approval",
        message: `${pending} chore ${pending === 1 ? "is" : "are"} pending parent review.`,
        href: "/app/my-chores",
        createdAt: nowIso,
      });
    }
  }

  const pendingExchangeCount = await prisma.starExchange.count({
    where: { userId, status: "PENDING" },
  });
  if (pendingExchangeCount > 0) {
    items.push({
      id: "kid-pending-exchange",
      kind: "UPDATE",
      severity: "INFO",
      title: "Exchange request pending",
      message: `${pendingExchangeCount} exchange ${pendingExchangeCount === 1 ? "request is" : "requests are"} waiting for review.`,
      href: "/app/awards",
      createdAt: nowIso,
    });
  }

  const reviewedExchanges = await prisma.starExchange.findMany({
    where: {
      userId,
      status: { in: ["APPROVED", "REJECTED"] },
      reviewedAt: { not: null },
    },
    orderBy: { reviewedAt: "desc" },
    take: 3,
    select: { id: true, stars: true, status: true, reviewedAt: true },
  });

  for (const ex of reviewedExchanges) {
    items.push({
      id: `kid-reviewed-${ex.id}`,
      kind: "UPDATE",
      severity: ex.status === "APPROVED" ? "SUCCESS" : "ERROR",
      title: "Exchange status updated",
      message: `${ex.stars}⭐ exchange was ${ex.status.toLowerCase()}.`,
      href: "/app/awards",
      createdAt: (ex.reviewedAt ?? new Date()).toISOString(),
    });
  }

  return items;
}

export async function GET() {
  const auth = await requireSessionUser();
  if ("status" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { me } = auth;

  const items =
    me.role === "ADULT"
      ? await adultNotifications(me.id, me.familyId)
      : await kidNotifications(me.id, me.familyId);

  // Prioritize reminders, then newest first.
  items.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "REMINDER" ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return NextResponse.json({
    items,
    unreadCount: items.length,
    generatedAt: new Date().toISOString(),
  });
}
