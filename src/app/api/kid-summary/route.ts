import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/requireUser";
import { addDays, startOfWeekMonday } from "@/lib/week";

export async function GET() {
  const auth = await requireSessionUser({ source: "api/kid-summary.GET" });
  if ("status" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { me } = auth;

  if (me.role !== "KID") {
    return NextResponse.json({ error: "Kid view only" }, { status: 403 });
  }

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

  return NextResponse.json({
    weeklyPoints: weeklyPointsAgg._sum.pointsEarned ?? 0,
    totalStarsEarned: starsAgg._sum.earned ?? 0,
    avatarUrl: me.avatarUrl ?? null,
    weekStart: weekStart.toISOString(),
  });
}
