export function dayKey(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
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
