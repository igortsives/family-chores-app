import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/requireUser";
import { getUserNotifications, syncUserReminderNotificationsIfStale } from "@/lib/notifications";
import { addDays, startOfWeekMonday } from "@/lib/week";

export async function GET() {
  const auth = await requireSessionUser({ source: "api/header-state.GET" });
  if ("status" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { me } = auth;

  await syncUserReminderNotificationsIfStale({
    userId: me.id,
    familyId: me.familyId,
    role: me.role,
  });

  const notificationsPromise = getUserNotifications(me.id);

  const kidSummaryPromise = me.role === "KID"
    ? (async () => {
      const weekStart = startOfWeekMonday(new Date());
      const weekEnd = addDays(weekStart, 7);

      const [weeklyPointsAgg, starsAgg] = await Promise.all([
        prisma.choreCompletion.aggregate({
          where: {
            userId: me.id,
            status: "APPROVED",
            completedAt: { gte: weekStart, lt: weekEnd },
          },
          _sum: { pointsEarned: true },
        }),
        prisma.starWeek.aggregate({
          where: { userId: me.id },
          _sum: { earned: true },
        }),
      ]);

      return {
        weeklyPoints: weeklyPointsAgg._sum.pointsEarned ?? 0,
        totalStarsEarned: starsAgg._sum.earned ?? 0,
        avatarUrl: me.avatarUrl ?? null,
        weekStart: weekStart.toISOString(),
      };
    })()
    : Promise.resolve(null);

  const [notifications, kidSummary] = await Promise.all([notificationsPromise, kidSummaryPromise]);

  return NextResponse.json({
    me: {
      id: me.id,
      role: me.role,
      username: me.username ?? null,
      name: me.name ?? null,
      email: me.email ?? null,
      avatarUrl: me.avatarUrl ?? null,
    },
    notifications: {
      items: notifications.items,
      unreadCount: notifications.unreadCount,
      generatedAt: new Date().toISOString(),
    },
    kidSummary,
  });
}
