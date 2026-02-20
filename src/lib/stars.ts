export function distributeStarsFromWeeklyScores(scores: number[]) {
  const earnedPerWeek: number[] = [];
  let progress = 0;
  let totalStars = 0;

  for (const raw of scores) {
    const score = Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 0;
    progress += score;
    const cumulativeStars = Math.floor(progress + 1e-9);
    const earned = Math.max(0, cumulativeStars - totalStars);
    earnedPerWeek.push(earned);
    totalStars = cumulativeStars;
  }

  return {
    earnedPerWeek,
    totalStars,
    progressRemainder: Number((progress - totalStars).toFixed(6)),
  };
}

