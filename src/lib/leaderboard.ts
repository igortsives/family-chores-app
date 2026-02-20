export function dayKey(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

export const HYBRID_WEIGHTS = {
  completionRate: 0.7,
  consistencyRate: 0.2,
  streakFactor: 0.1,
} as const;

export function computeHybridScore(input: {
  expectedDue: number;
  approvedCount: number;
  possibleActiveDays: number;
  activeDays: number;
  streakDays: number;
}) {
  const expectedDue = Math.max(0, input.expectedDue);
  const approvedCount = Math.max(0, input.approvedCount);
  const possibleActiveDays = Math.max(0, input.possibleActiveDays);
  const activeDays = Math.max(0, input.activeDays);
  const streakDays = Math.max(0, input.streakDays);

  const completionRate = expectedDue > 0 ? Math.min(1, approvedCount / expectedDue) : 0;
  const consistencyRate = possibleActiveDays > 0 ? Math.min(1, activeDays / possibleActiveDays) : 0;
  const streakFactor = Math.min(1, streakDays / 7);

  const scoreRaw =
    HYBRID_WEIGHTS.completionRate * completionRate
    + HYBRID_WEIGHTS.consistencyRate * consistencyRate
    + HYBRID_WEIGHTS.streakFactor * streakFactor;
  const score = Math.max(0, Math.min(1, Number(scoreRaw.toFixed(6))));

  return {
    completionRate,
    consistencyRate,
    streakFactor,
    score,
    scorePct: Math.round(score * 100),
  };
}

export function computeStreak(dayKeys: string[], now = new Date()) {
  // dayKeys must be unique and sorted ascending (YYYY-MM-DD).
  if (dayKeys.length === 0) return 0;
  const set = new Set(dayKeys);

  const today = new Date(now);
  const todayKey = dayKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = dayKey(yesterday);

  // streak counts consecutive days ending today if today has activity,
  // otherwise ending yesterday if yesterday has activity.
  const end = set.has(todayKey) ? new Date(today) : set.has(yKey) ? yesterday : null;
  if (!end) return 0;

  let streak = 0;
  while (true) {
    const k = dayKey(end);
    if (!set.has(k)) break;
    streak += 1;
    end.setDate(end.getDate() - 1);
  }
  return streak;
}
