import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeStreak, dayKey } from "@/lib/leaderboard";

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

  // Pull approved completions for these kids (last 180 days is plenty for streaks)
  const since = new Date();
  since.setDate(since.getDate() - 180);

  const completions = await prisma.choreCompletion.findMany({
    where: {
      userId: { in: kidIds },
      status: "APPROVED",
      completedAt: { gte: since },
      choreInstance: { familyId: me.familyId },
    },
    select: { userId: true, pointsEarned: true, completedAt: true },
  });

  // Compute totals + streak basis per kid
  const totals = new Map<string, number>();
  const days = new Map<string, Set<string>>();
  for (const c of completions) {
    totals.set(c.userId, (totals.get(c.userId) ?? 0) + (c.pointsEarned ?? 0));
    const s = days.get(c.userId) ?? new Set<string>();
    s.add(dayKey(c.completedAt));
    days.set(c.userId, s);
  }

  const rows = kids.map((k) => {
    const points = totals.get(k.id) ?? 0;
    const dk = Array.from(days.get(k.id) ?? new Set<string>()).sort();
    const streak = computeStreak(dk);

    const earned = awards.filter((a) => (a.thresholdPoints ?? 0) <= points);
    const next = awards.find((a) => (a.thresholdPoints ?? 0) > points) ?? null;

    return {
      kid: k,
      points,
      streak,
      awardsEarned: earned.map((a) => ({ id: a.id, name: a.name, icon: a.icon, thresholdPoints: a.thresholdPoints })),
      nextAward: next ? { id: next.id, name: next.name, icon: next.icon, thresholdPoints: next.thresholdPoints } : null,
    };
  });

  // Sort by points desc, then streak desc, then name
  rows.sort((a, b) => (b.points - a.points) || (b.streak - a.streak) || ((a.kid.name ?? a.kid.email).localeCompare(b.kid.name ?? b.kid.email)));

  return NextResponse.json({ rows, awards });
}
