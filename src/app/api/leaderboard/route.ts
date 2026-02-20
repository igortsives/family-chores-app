import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HYBRID_WEIGHTS, computeHybridScore, computeStreak, dayKey } from "@/lib/leaderboard";
import { addDays, startOfWeekMonday } from "@/lib/week";

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { email },
    select: { id: true, familyId: true },
  });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get kids (leaderboard focuses on kids; change if you want adults too)
  const kids = await prisma.user.findMany({
    where: { familyId: me.familyId, role: "KID", isHidden: false },
    select: { id: true, name: true, email: true },
    orderBy: [{ name: "asc" }, { email: "asc" }],
  });

  const awards = await prisma.award.findMany({
    where: { familyId: me.familyId },
    select: { id: true, name: true, icon: true, thresholdPoints: true },
    orderBy: { thresholdPoints: "asc" },
  });

  const kidIds = kids.map((k) => k.id);
  if (kidIds.length === 0) {
    return NextResponse.json({
      rows: [],
      awards,
      meta: {
        weekStart: startOfWeekMonday(new Date()).toISOString(),
        weights: HYBRID_WEIGHTS,
      },
    });
  }

  const weekStart = startOfWeekMonday(new Date());
  const weekEnd = addDays(weekStart, 7);
  const weekDayKeys = Array.from({ length: 7 }, (_, idx) => dayKey(addDays(weekStart, idx)));

  // Count chores due this week by kid from assignments + schedules.
  // This normalizes ranking opportunity when kids have different amounts of chores.
  const assignments = await prisma.choreAssignment.findMany({
    where: {
      userId: { in: kidIds },
      chore: { familyId: me.familyId, active: true },
    },
    select: {
      userId: true,
      chore: {
        select: {
          schedules: { select: { frequency: true, dayOfWeek: true } },
        },
      },
    },
  });

  const expectedDueByUser = new Map<string, number>(kidIds.map((id) => [id, 0]));
  const possibleActiveDayKeysByUser = new Map<string, Set<string>>(kidIds.map((id) => [id, new Set<string>()]));
  for (const assignment of assignments) {
    const schedules = assignment.chore.schedules.length
      ? assignment.chore.schedules
      : [{ frequency: "DAILY", dayOfWeek: null }];

    let countForAssignment = 0;
    const dueDayKeys = possibleActiveDayKeysByUser.get(assignment.userId) ?? new Set<string>();
    for (const schedule of schedules) {
      if (schedule.frequency === "DAILY") {
        countForAssignment += 7;
        for (const d of weekDayKeys) dueDayKeys.add(d);
        continue;
      }
      if (
        schedule.frequency === "WEEKLY"
        && Number.isInteger(schedule.dayOfWeek)
        && (schedule.dayOfWeek ?? -1) >= 0
        && (schedule.dayOfWeek ?? -1) <= 6
      ) {
        countForAssignment += 1;
        // weekStart is Monday. Schedule dayOfWeek is 0=Sun..6=Sat.
        const offsetFromMonday = ((schedule.dayOfWeek ?? 0) + 6) % 7;
        dueDayKeys.add(dayKey(addDays(weekStart, offsetFromMonday)));
      }
    }

    possibleActiveDayKeysByUser.set(assignment.userId, dueDayKeys);
    expectedDueByUser.set(
      assignment.userId,
      (expectedDueByUser.get(assignment.userId) ?? 0) + countForAssignment,
    );
  }

  // Pull approved completions for these kids.
  // 180 days supports streak calculations while weekly metrics are filtered by due date.
  const since = new Date();
  since.setDate(since.getDate() - 180);

  const completions = await prisma.choreCompletion.findMany({
    where: {
      userId: { in: kidIds },
      status: "APPROVED",
      completedAt: { gte: since },
      choreInstance: { familyId: me.familyId },
    },
    select: {
      userId: true,
      pointsEarned: true,
      completedAt: true,
      choreInstanceId: true,
      choreInstance: { select: { dueDate: true } },
    },
  });

  const lifetimePointSums = await prisma.choreCompletion.groupBy({
    by: ["userId"],
    where: {
      userId: { in: kidIds },
      status: "APPROVED",
      choreInstance: { familyId: me.familyId },
    },
    _sum: { pointsEarned: true },
  });

  const lifetimePointsByUser = new Map<string, number>();
  for (const row of lifetimePointSums) {
    lifetimePointsByUser.set(row.userId, row._sum.pointsEarned ?? 0);
  }

  // Compute streak basis per kid and dedupe approved completions per instance for weekly scoring.
  const daysByUser = new Map<string, Set<string>>();
  const approvedWeeklyByKey = new Map<string, (typeof completions)[number]>();
  for (const c of completions) {
    const s = daysByUser.get(c.userId) ?? new Set<string>();
    s.add(dayKey(c.completedAt));
    daysByUser.set(c.userId, s);

    const dueDate = c.choreInstance.dueDate;
    if (dueDate < weekStart || dueDate >= weekEnd) continue;

    const dedupeKey = `${c.userId}:${c.choreInstanceId}`;
    const existing = approvedWeeklyByKey.get(dedupeKey);
    if (!existing || existing.completedAt < c.completedAt) {
      approvedWeeklyByKey.set(dedupeKey, c);
    }
  }

  const approvedCountByUser = new Map<string, number>();
  const activeDayKeysByUser = new Map<string, Set<string>>();
  const weeklyPointsByUser = new Map<string, number>();

  for (const c of approvedWeeklyByKey.values()) {
    approvedCountByUser.set(c.userId, (approvedCountByUser.get(c.userId) ?? 0) + 1);
    weeklyPointsByUser.set(c.userId, (weeklyPointsByUser.get(c.userId) ?? 0) + (c.pointsEarned ?? 0));
    const active = activeDayKeysByUser.get(c.userId) ?? new Set<string>();
    active.add(dayKey(c.choreInstance.dueDate));
    activeDayKeysByUser.set(c.userId, active);
  }

  const rows = kids.map((k) => {
    const expectedDue = expectedDueByUser.get(k.id) ?? 0;
    const approvedCount = approvedCountByUser.get(k.id) ?? 0;
    const possibleActiveDays = (possibleActiveDayKeysByUser.get(k.id) ?? new Set<string>()).size;
    const activeDays = (activeDayKeysByUser.get(k.id) ?? new Set<string>()).size;
    const weeklyPoints = weeklyPointsByUser.get(k.id) ?? 0;
    const points = lifetimePointsByUser.get(k.id) ?? 0;

    const dk = Array.from(daysByUser.get(k.id) ?? new Set<string>()).sort();
    const streak = computeStreak(dk);
    const hybrid = computeHybridScore({
      expectedDue,
      approvedCount,
      possibleActiveDays,
      activeDays,
      streakDays: streak,
    });

    const earned = awards.filter((a) => (a.thresholdPoints ?? 0) <= points);
    const next = awards.find((a) => (a.thresholdPoints ?? 0) > points) ?? null;

    return {
      kid: k,
      score: hybrid.score,
      scorePct: hybrid.scorePct,
      completionRate: hybrid.completionRate,
      consistencyRate: hybrid.consistencyRate,
      streakFactor: hybrid.streakFactor,
      expectedDue,
      approvedCount,
      possibleActiveDays,
      activeDays,
      weeklyPoints,
      points,
      streak,
      awardsEarned: earned.map((a) => ({ id: a.id, name: a.name, icon: a.icon, thresholdPoints: a.thresholdPoints })),
      nextAward: next ? { id: next.id, name: next.name, icon: next.icon, thresholdPoints: next.thresholdPoints } : null,
    };
  });

  // Sort by normalized hybrid metrics only (coins do not influence ranking).
  rows.sort((a, b) =>
    (b.score - a.score)
    || (b.completionRate - a.completionRate)
    || (b.consistencyRate - a.consistencyRate)
    || (b.streak - a.streak)
    || ((a.kid.name ?? a.kid.email).localeCompare(b.kid.name ?? b.kid.email)));

  return NextResponse.json({
    rows,
    awards,
    meta: {
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      weights: HYBRID_WEIGHTS,
      rankingPolicy: "RANK_BY_NORMALIZED_SCORE_ONLY",
    },
  });
}
