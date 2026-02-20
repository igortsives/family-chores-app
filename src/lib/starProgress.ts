import { prisma } from "@/lib/prisma";
import { addDays, startOfWeekMonday } from "@/lib/week";
import { computeHybridScore, computeStreak, dayKey } from "@/lib/leaderboard";
import { distributeStarsFromWeeklyScores } from "@/lib/stars";
import { createNotification } from "@/lib/notifications";

function weekStartsBetween(startInclusive: Date, endExclusive: Date) {
  const out: Date[] = [];
  for (let w = startOfWeekMonday(startInclusive); w < endExclusive; w = addDays(w, 7)) {
    out.push(new Date(w));
  }
  return out;
}

export type RecomputeStarWeeksForKidResult = {
  totalStars: number;
  carryoverProgress: number;
  currentWeekProgress: number;
  progressTowardNextStar: number;
};

export async function recomputeStarWeeksForKid(
  userId: string,
  familyId: string,
  options?: { notifyOnNewStars?: boolean },
): Promise<RecomputeStarWeeksForKidResult> {
  const notifyOnNewStars = options?.notifyOnNewStars ?? true;
  const currentWeekStart = startOfWeekMonday(new Date());
  const currentWeekEnd = addDays(currentWeekStart, 7);

  const assignments = await prisma.choreAssignment.findMany({
    where: { userId, chore: { familyId } },
    select: { choreId: true },
  });
  const choreIds = Array.from(new Set(assignments.map((a) => a.choreId)));
  if (choreIds.length === 0) {
    const earnedAgg = await prisma.starWeek.aggregate({
      where: { userId },
      _sum: { earned: true },
    });
    return {
      totalStars: earnedAgg._sum.earned ?? 0,
      carryoverProgress: 0,
      currentWeekProgress: 0,
      progressTowardNextStar: 0,
    };
  }

  const firstDue = await prisma.choreInstance.findFirst({
    where: { familyId, choreId: { in: choreIds }, dueDate: { lt: currentWeekStart } },
    orderBy: { dueDate: "asc" },
    select: { dueDate: true },
  });
  const startWeek = firstDue ? startOfWeekMonday(firstDue.dueDate) : currentWeekStart;
  const weekStarts = firstDue ? weekStartsBetween(startWeek, currentWeekStart) : [];
  const closedInstances = await prisma.choreInstance.findMany({
    where: {
      familyId,
      choreId: { in: choreIds },
      dueDate: { gte: startWeek, lt: currentWeekStart },
    },
    select: { id: true, dueDate: true },
  });

  const closedInstanceById = new Map(closedInstances.map((i) => [i.id, i] as const));
  const expectedDueByWeek = new Map<string, number>();
  const possibleActiveDaysByWeek = new Map<string, Set<string>>();

  for (const inst of closedInstances) {
    const weekKey = dayKey(startOfWeekMonday(inst.dueDate));
    expectedDueByWeek.set(weekKey, (expectedDueByWeek.get(weekKey) ?? 0) + 1);
    const days = possibleActiveDaysByWeek.get(weekKey) ?? new Set<string>();
    days.add(dayKey(inst.dueDate));
    possibleActiveDaysByWeek.set(weekKey, days);
  }

  const closedInstanceIds = closedInstances.map((i) => i.id);
  const closedCompletions = closedInstanceIds.length
    ? await prisma.choreCompletion.findMany({
        where: {
          userId,
          status: "APPROVED",
          choreInstanceId: { in: closedInstanceIds },
        } as any,
        select: { choreInstanceId: true, completedAt: true },
        orderBy: { completedAt: "asc" },
      })
    : [];

  const latestClosedByInstance = new Map<string, { choreInstanceId: string; completedAt: Date }>();
  for (const c of closedCompletions) {
    const existing = latestClosedByInstance.get(c.choreInstanceId);
    if (!existing || existing.completedAt < c.completedAt) {
      latestClosedByInstance.set(c.choreInstanceId, c);
    }
  }

  const approvedCountByWeek = new Map<string, number>();
  const activeDaysByWeek = new Map<string, Set<string>>();
  const activityDayKeys = new Set<string>();

  for (const c of latestClosedByInstance.values()) {
    const inst = closedInstanceById.get(c.choreInstanceId);
    if (!inst) continue;

    const weekKey = dayKey(startOfWeekMonday(inst.dueDate));
    approvedCountByWeek.set(weekKey, (approvedCountByWeek.get(weekKey) ?? 0) + 1);

    const activeDays = activeDaysByWeek.get(weekKey) ?? new Set<string>();
    activeDays.add(dayKey(inst.dueDate));
    activeDaysByWeek.set(weekKey, activeDays);

    activityDayKeys.add(dayKey(c.completedAt));
  }

  const sortedActivity = Array.from(activityDayKeys).sort();
  const activeToDate = new Set<string>();
  let activityIdx = 0;
  const weeklyScores: number[] = [];

  for (const weekStart of weekStarts) {
    const weekKey = dayKey(weekStart);
    const weekEndDay = addDays(weekStart, 6);
    const endKey = dayKey(weekEndDay);

    while (activityIdx < sortedActivity.length && sortedActivity[activityIdx] <= endKey) {
      activeToDate.add(sortedActivity[activityIdx]);
      activityIdx += 1;
    }

    const streak = computeStreak(Array.from(activeToDate).sort(), weekEndDay);
    const expectedDue = expectedDueByWeek.get(weekKey) ?? 0;
    const approvedCount = approvedCountByWeek.get(weekKey) ?? 0;
    const possibleActiveDays = (possibleActiveDaysByWeek.get(weekKey) ?? new Set<string>()).size;
    const activeDays = (activeDaysByWeek.get(weekKey) ?? new Set<string>()).size;

    const hybrid = computeHybridScore({
      expectedDue,
      approvedCount,
      possibleActiveDays,
      activeDays,
      streakDays: streak,
    });

    weeklyScores.push(hybrid.score);
  }

  const distribution = distributeStarsFromWeeklyScores(weeklyScores);
  if (weekStarts.length > 0) {
    const existingWeeks = await prisma.starWeek.findMany({
      where: { userId, weekStart: { in: weekStarts } },
      select: { weekStart: true, earned: true },
    });
    const existingByWeek = new Map(existingWeeks.map((w) => [dayKey(w.weekStart), w.earned] as const));
    const newlyAwarded: Array<{ weekStart: Date; gained: number }> = [];

    weekStarts.forEach((weekStart, idx) => {
      const key = dayKey(weekStart);
      const prev = existingByWeek.get(key) ?? 0;
      const next = distribution.earnedPerWeek[idx] ?? 0;
      if (next > prev) {
        newlyAwarded.push({ weekStart, gained: next - prev });
      }
    });

    await prisma.$transaction(
      weekStarts.map((weekStart, idx) =>
        prisma.starWeek.upsert({
          where: { userId_weekStart: { userId, weekStart } } as any,
          create: { userId, weekStart, earned: distribution.earnedPerWeek[idx] },
          update: { earned: distribution.earnedPerWeek[idx], computedAt: new Date() } as any,
        }),
      ),
    );

    if (notifyOnNewStars && newlyAwarded.length > 0) {
      const gainedTotal = newlyAwarded.reduce((sum, x) => sum + x.gained, 0);
      const latestWeek = newlyAwarded.reduce(
        (latest, x) => (x.weekStart > latest ? x.weekStart : latest),
        newlyAwarded[0].weekStart,
      );
      await createNotification({
        userId,
        sourceKey: `star-earned-${dayKey(latestWeek)}-${gainedTotal}`,
        kind: "UPDATE",
        severity: "SUCCESS",
        title: gainedTotal === 1 ? "You earned a new star!" : `You earned ${gainedTotal} new stars!`,
        message: gainedTotal === 1
          ? "Great job! Your progress just earned another star."
          : "Great job! Your progress just earned more stars.",
        href: "/app/awards",
      });
    }
  }

  // Include current-week score as live progress preview (does not add spendable stars until week closes).
  const currentInstances = await prisma.choreInstance.findMany({
    where: {
      familyId,
      choreId: { in: choreIds },
      dueDate: { gte: currentWeekStart, lt: currentWeekEnd },
    },
    select: { id: true, dueDate: true },
  });
  const currentInstanceIds = currentInstances.map((i) => i.id);
  const currentCompletions = currentInstanceIds.length
    ? await prisma.choreCompletion.findMany({
        where: {
          userId,
          status: "APPROVED",
          choreInstanceId: { in: currentInstanceIds },
        } as any,
        select: { choreInstanceId: true, completedAt: true },
        orderBy: { completedAt: "asc" },
      })
    : [];
  const currentInstanceById = new Map(currentInstances.map((i) => [i.id, i] as const));
  const latestCurrentByInstance = new Map<string, { choreInstanceId: string; completedAt: Date }>();
  for (const c of currentCompletions) {
    const existing = latestCurrentByInstance.get(c.choreInstanceId);
    if (!existing || existing.completedAt < c.completedAt) {
      latestCurrentByInstance.set(c.choreInstanceId, c);
    }
  }
  const currentExpectedDue = currentInstances.length;
  const currentApprovedCount = latestCurrentByInstance.size;
  const currentPossibleActiveDays = new Set(currentInstances.map((i) => dayKey(i.dueDate))).size;
  const currentActiveDays = new Set(
    Array.from(latestCurrentByInstance.values()).map((c) => {
      const inst = currentInstanceById.get(c.choreInstanceId);
      return inst ? dayKey(inst.dueDate) : "";
    }).filter(Boolean),
  ).size;

  const streakCompletions = await prisma.choreCompletion.findMany({
    where: {
      userId,
      status: "APPROVED",
      completedAt: { gte: startWeek, lt: currentWeekEnd },
      choreInstance: { familyId, choreId: { in: choreIds } },
    },
    select: { completedAt: true },
  });
  const currentStreak = computeStreak(
    Array.from(new Set(streakCompletions.map((c) => dayKey(c.completedAt)))).sort(),
    new Date(),
  );
  const currentHybrid = computeHybridScore({
    expectedDue: currentExpectedDue,
    approvedCount: currentApprovedCount,
    possibleActiveDays: currentPossibleActiveDays,
    activeDays: currentActiveDays,
    streakDays: currentStreak,
  });
  const carryoverProgress = distribution.progressRemainder;
  const currentWeekProgress = currentHybrid.score;
  const previewProgress = Math.min(0.99, Number((carryoverProgress + currentWeekProgress).toFixed(6)));

  return {
    totalStars: distribution.totalStars,
    carryoverProgress,
    currentWeekProgress,
    progressTowardNextStar: previewProgress,
  };
}
