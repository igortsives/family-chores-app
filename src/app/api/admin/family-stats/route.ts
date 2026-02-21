import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdult } from "@/lib/requireUser";
import { HYBRID_WEIGHTS, computeHybridScore, computeStreak, dayKey } from "@/lib/leaderboard";
import { addDays, startOfWeekMonday } from "@/lib/week";
import { recomputeStarWeeksForKid } from "@/lib/starProgress";

export async function GET() {
  const auth = await requireAdult({ source: "api/admin/family-stats.GET" });
  if ("status" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { me } = auth;

  const kids = await prisma.user.findMany({
    where: { familyId: me.familyId, role: "KID", isHidden: false, isActive: true },
    select: { id: true, name: true, username: true, email: true },
    orderBy: [{ name: "asc" }, { username: "asc" }, { email: "asc" }],
  });

  const awards = await prisma.award.findMany({
    where: { familyId: me.familyId },
    select: { id: true, name: true, icon: true, thresholdPoints: true },
    orderBy: { thresholdPoints: "asc" },
  });

  const kidIds = kids.map((k) => k.id);
  const weekStart = startOfWeekMonday(new Date());
  const weekEnd = addDays(weekStart, 7);
  const weekDayKeys = Array.from({ length: 7 }, (_, idx) => dayKey(addDays(weekStart, idx)));

  if (kidIds.length === 0) {
    return NextResponse.json({
      rows: [],
      totals: {
        participants: 0,
        weeklyCoins: 0,
        lifetimeCoins: 0,
        starsEarned: 0,
        starsBalance: 0,
        approvedThisWeek: 0,
        expectedThisWeek: 0,
        overallCompletionPct: 0,
        overallConsistencyPct: 0,
        avgScorePct: 0,
        avgNextStarPct: 0,
      },
      meta: {
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        weights: HYBRID_WEIGHTS,
      },
    });
  }

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

  const spentSums = await prisma.starExchange.groupBy({
    by: ["userId"],
    where: {
      userId: { in: kidIds },
      status: "APPROVED",
    },
    _sum: { stars: true },
  });

  const lifetimePointsByUser = new Map<string, number>();
  for (const row of lifetimePointSums) {
    lifetimePointsByUser.set(row.userId, row._sum.pointsEarned ?? 0);
  }

  const spentStarsByUser = new Map<string, number>();
  for (const row of spentSums) {
    spentStarsByUser.set(row.userId, row._sum.stars ?? 0);
  }

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

  const starSnapshots = await Promise.all(
    kids.map(async (kid) => {
      const out = await recomputeStarWeeksForKid(kid.id, me.familyId, { notifyOnNewStars: false });
      return [kid.id, out] as const;
    }),
  );
  const starsByUser = new Map(starSnapshots);

  const rows = kids.map((kid) => {
    const expectedDue = expectedDueByUser.get(kid.id) ?? 0;
    const approvedCount = approvedCountByUser.get(kid.id) ?? 0;
    const possibleActiveDays = (possibleActiveDayKeysByUser.get(kid.id) ?? new Set<string>()).size;
    const activeDays = (activeDayKeysByUser.get(kid.id) ?? new Set<string>()).size;
    const weeklyCoins = weeklyPointsByUser.get(kid.id) ?? 0;
    const lifetimeCoins = lifetimePointsByUser.get(kid.id) ?? 0;
    const days = Array.from(daysByUser.get(kid.id) ?? new Set<string>()).sort();
    const streak = computeStreak(days);

    const hybrid = computeHybridScore({
      expectedDue,
      approvedCount,
      possibleActiveDays,
      activeDays,
      streakDays: streak,
    });
    const star = starsByUser.get(kid.id) ?? {
      totalStars: 0,
      carryoverProgress: 0,
      currentWeekProgress: 0,
      progressTowardNextStar: 0,
    };
    const starsSpent = spentStarsByUser.get(kid.id) ?? 0;
    const starsEarned = star.totalStars ?? 0;
    const starBalance = Math.max(0, starsEarned - starsSpent);
    const awardsUnlocked = awards.filter((a) => (a.thresholdPoints ?? 0) <= lifetimeCoins).length;
    const nextAward = awards.find((a) => (a.thresholdPoints ?? 0) > lifetimeCoins) ?? null;

    return {
      kid,
      score: hybrid.score,
      scorePct: hybrid.scorePct,
      completionPct: Math.round(hybrid.completionRate * 100),
      consistencyPct: Math.round(hybrid.consistencyRate * 100),
      streakDays: streak,
      approvedThisWeek: approvedCount,
      expectedThisWeek: expectedDue,
      possibleActiveDays,
      activeDays,
      weeklyCoins,
      lifetimeCoins,
      starsEarned,
      starsSpent,
      starBalance,
      carryoverPct: Math.round((star.carryoverProgress ?? 0) * 100),
      currentWeekPct: Math.round((star.currentWeekProgress ?? 0) * 100),
      nextStarPct: Math.round((star.progressTowardNextStar ?? 0) * 100),
      awardsUnlocked,
      nextAward: nextAward
        ? {
            id: nextAward.id,
            name: nextAward.name,
            icon: nextAward.icon,
            thresholdPoints: nextAward.thresholdPoints,
          }
        : null,
    };
  });

  rows.sort((a, b) =>
    (b.score - a.score)
    || (b.completionPct - a.completionPct)
    || (b.consistencyPct - a.consistencyPct)
    || (b.streakDays - a.streakDays)
    || ((a.kid.name ?? a.kid.email).localeCompare(b.kid.name ?? b.kid.email)));

  const rankedRows = rows.map((row, idx) => ({ ...row, rank: idx + 1 }));

  const totalsRaw = rankedRows.reduce(
    (acc, row) => {
      acc.weeklyCoins += row.weeklyCoins;
      acc.lifetimeCoins += row.lifetimeCoins;
      acc.starsEarned += row.starsEarned;
      acc.starsBalance += row.starBalance;
      acc.approvedThisWeek += row.approvedThisWeek;
      acc.expectedThisWeek += row.expectedThisWeek;
      acc.scorePctSum += row.scorePct;
      acc.nextStarPctSum += row.nextStarPct;
      acc.activeDays += row.activeDays;
      acc.possibleActiveDays += row.possibleActiveDays;
      return acc;
    },
    {
      weeklyCoins: 0,
      lifetimeCoins: 0,
      starsEarned: 0,
      starsBalance: 0,
      approvedThisWeek: 0,
      expectedThisWeek: 0,
      scorePctSum: 0,
      nextStarPctSum: 0,
      activeDays: 0,
      possibleActiveDays: 0,
    },
  );

  const participantCount = rankedRows.length;
  const totals = {
    participants: participantCount,
    weeklyCoins: totalsRaw.weeklyCoins,
    lifetimeCoins: totalsRaw.lifetimeCoins,
    starsEarned: totalsRaw.starsEarned,
    starsBalance: totalsRaw.starsBalance,
    approvedThisWeek: totalsRaw.approvedThisWeek,
    expectedThisWeek: totalsRaw.expectedThisWeek,
    overallCompletionPct: totalsRaw.expectedThisWeek > 0
      ? Math.round((totalsRaw.approvedThisWeek / totalsRaw.expectedThisWeek) * 100)
      : 0,
    overallConsistencyPct: totalsRaw.possibleActiveDays > 0
      ? Math.round((totalsRaw.activeDays / totalsRaw.possibleActiveDays) * 100)
      : 0,
    avgScorePct: participantCount > 0 ? Math.round(totalsRaw.scorePctSum / participantCount) : 0,
    avgNextStarPct: participantCount > 0 ? Math.round(totalsRaw.nextStarPctSum / participantCount) : 0,
  };

  return NextResponse.json({
    rows: rankedRows,
    totals,
    meta: {
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      weights: HYBRID_WEIGHTS,
    },
  });
}
