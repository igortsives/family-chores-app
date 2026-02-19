import { NotificationKind, NotificationSeverity, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type ReminderPayload = {
  severity: NotificationSeverity;
  title: string;
  message: string;
  href: string;
};

type CreateNotificationInput = {
  userId: string;
  kind: NotificationKind;
  severity: NotificationSeverity;
  title: string;
  message: string;
  href: string;
  sourceKey?: string | null;
  forceUnread?: boolean;
};

export type NotificationFeedItem = {
  id: string;
  kind: NotificationKind;
  severity: NotificationSeverity;
  title: string;
  message: string;
  href: string;
  createdAt: string;
  readAt: string | null;
};

export async function createNotification(input: CreateNotificationInput) {
  const sourceKey = input.sourceKey?.trim() || null;
  const forceUnread = input.forceUnread ?? true;

  if (!sourceKey) {
    return prisma.notification.create({
      data: {
        userId: input.userId,
        kind: input.kind,
        severity: input.severity,
        title: input.title,
        message: input.message,
        href: input.href,
        readAt: forceUnread ? null : undefined,
      },
      select: { id: true },
    });
  }

  const existing = await prisma.notification.findUnique({
    where: { userId_sourceKey: { userId: input.userId, sourceKey } },
    select: {
      id: true,
      title: true,
      message: true,
      href: true,
      severity: true,
      kind: true,
      readAt: true,
      dismissedAt: true,
    },
  });

  const changed =
    !existing ||
    existing.kind !== input.kind ||
    existing.severity !== input.severity ||
    existing.title !== input.title ||
    existing.message !== input.message ||
    existing.href !== input.href;

  return prisma.notification.upsert({
    where: { userId_sourceKey: { userId: input.userId, sourceKey } },
    create: {
      userId: input.userId,
      sourceKey,
      kind: input.kind,
      severity: input.severity,
      title: input.title,
      message: input.message,
      href: input.href,
      readAt: forceUnread ? null : undefined,
    },
    update: {
      kind: input.kind,
      severity: input.severity,
      title: input.title,
      message: input.message,
      href: input.href,
      dismissedAt: null,
      readAt: forceUnread || changed ? null : existing?.readAt,
    },
    select: { id: true },
  });
}

async function upsertReminder(
  userId: string,
  sourceKey: string,
  payload: ReminderPayload | null
) {
  if (!payload) {
    await prisma.notification.deleteMany({
      where: { userId, sourceKey },
    });
    return;
  }

  await prisma.notification.upsert({
    where: { userId_sourceKey: { userId, sourceKey } },
    create: {
      userId,
      sourceKey,
      kind: "REMINDER",
      severity: payload.severity,
      title: payload.title,
      message: payload.message,
      href: payload.href,
    },
    update: {
      kind: "REMINDER",
      severity: payload.severity,
      title: payload.title,
      message: payload.message,
      href: payload.href,
      // Reminders represent current actionable state. Keep them active/unread
      // whenever the condition is true so the bell reliably reflects pending work.
      dismissedAt: null,
      readAt: null,
    },
  });
}

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

async function syncAdultReminders(userId: string, familyId: string) {
  const pendingApprovals = await prisma.choreCompletion.count({
    where: { status: "PENDING", choreInstance: { familyId } },
  });
  await upsertReminder(
    userId,
    "adult-pending-approvals",
    pendingApprovals > 0
      ? {
          severity: "WARNING",
          title: "Pending chore approvals",
          message: `${pendingApprovals} chore ${pendingApprovals === 1 ? "needs" : "need"} your review.`,
          href: "/app/admin/approvals",
        }
      : null
  );

  const pendingExchanges = await prisma.starExchange.count({
    where: { status: "PENDING", user: { familyId } },
  });
  await upsertReminder(
    userId,
    "adult-pending-exchanges",
    pendingExchanges > 0
      ? {
          severity: "WARNING",
          title: "Pending star exchanges",
          message: `${pendingExchanges} request${pendingExchanges === 1 ? " is" : "s are"} awaiting review.`,
          href: "/app/admin/stars",
        }
      : null
  );
}

async function syncKidReminders(userId: string, familyId: string) {
  const chores = await prisma.chore.findMany({
    where: {
      familyId,
      active: true,
      assignments: { some: { userId } },
    },
    select: { id: true },
  });

  const start = startOfToday();
  const end = endOfToday();

  let notDone = 0;
  let pending = 0;
  let rejected = 0;

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
          select: { status: true },
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
    notDone = statuses.filter((s) => s === "NOT_DONE").length;
    pending = statuses.filter((s) => s === "PENDING").length;
    rejected = statuses.filter((s) => s === "REJECTED").length;
  }

  await upsertReminder(
    userId,
    "kid-rejected",
    rejected > 0
      ? {
          severity: "ERROR",
          title: "Try these chores again",
          message: `${rejected} chore${rejected === 1 ? "" : "s"} need${rejected === 1 ? "s" : ""} another try.`,
          href: "/app/my-chores",
        }
      : null
  );

  await upsertReminder(
    userId,
    "kid-not-done",
    notDone > 0
      ? {
          severity: "WARNING",
          title: "Chores left today",
          message: `You still have ${notDone} chore${notDone === 1 ? "" : "s"} left today.`,
          href: "/app/my-chores",
        }
      : null
  );

  await upsertReminder(
    userId,
    "kid-pending-approvals",
    pending > 0
      ? {
          severity: "INFO",
          title: "Waiting for parent check",
          message: `${pending} chore${pending === 1 ? "" : "s"} waiting for parent review.`,
          href: "/app/my-chores",
        }
      : null
  );

  const pendingExchangeCount = await prisma.starExchange.count({
    where: { userId, status: "PENDING" },
  });
  await upsertReminder(
    userId,
    "kid-pending-exchange",
    pendingExchangeCount > 0
      ? {
          severity: "INFO",
          title: "Star request waiting",
          message: `${pendingExchangeCount} star request${pendingExchangeCount === 1 ? "" : "s"} waiting for review.`,
          href: "/app/awards",
        }
      : null
  );
}

export async function syncUserReminderNotifications(params: {
  userId: string;
  familyId: string;
  role: Role;
}) {
  if (params.role === "ADULT") {
    await syncAdultReminders(params.userId, params.familyId);
    return;
  }
  await syncKidReminders(params.userId, params.familyId);
}

export async function getUserNotifications(userId: string) {
  const [rows, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: {
        userId,
        dismissedAt: null,
      },
      orderBy: [{ kind: "asc" }, { createdAt: "desc" }],
      take: 100,
      select: {
        id: true,
        kind: true,
        severity: true,
        title: true,
        message: true,
        href: true,
        createdAt: true,
        readAt: true,
      },
    }),
    prisma.notification.count({
      where: {
        userId,
        dismissedAt: null,
        readAt: null,
      },
    }),
  ]);

  const items: NotificationFeedItem[] = rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    severity: r.severity,
    title: r.title,
    message: r.message,
    href: r.href,
    createdAt: r.createdAt.toISOString(),
    readAt: r.readAt?.toISOString() ?? null,
  }));

  return { items, unreadCount };
}

export async function markNotificationRead(userId: string, notificationId: string) {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId, dismissedAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, dismissedAt: null, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markNotificationUnread(userId: string, notificationId: string) {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId, dismissedAt: null },
    data: { readAt: null },
  });
}

export async function dismissNotification(userId: string, notificationId: string) {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { dismissedAt: new Date() },
  });
}
