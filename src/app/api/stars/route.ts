import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/requireUser";
import { recomputeStarWeeksForKid } from "@/lib/starProgress";

export async function GET() {
  const auth = await requireSessionUser();
  if ("status" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { me } = auth;

  let progressTowardNextStar = 0;
  let carryoverProgress = 0;
  let currentWeekProgress = 0;
  let familyProgress: Array<{
    kid: { id: string; name: string | null; username: string | null };
    carryoverPct: number;
    currentWeekPct: number;
    nextStarPct: number;
  }> = [];

  if (me.role === "KID") {
    const out = await recomputeStarWeeksForKid(me.id, me.familyId);
    carryoverProgress = out.carryoverProgress;
    currentWeekProgress = out.currentWeekProgress;
    progressTowardNextStar = out.progressTowardNextStar;
  } else if (me.role === "ADULT") {
    const kids = await prisma.user.findMany({
      where: { familyId: me.familyId, role: "KID", isHidden: false, isActive: true },
      select: { id: true, name: true, username: true },
      orderBy: [{ name: "asc" }, { username: "asc" }],
    });
    familyProgress = await Promise.all(
      kids.map(async (kid) => {
        const out = await recomputeStarWeeksForKid(kid.id, me.familyId);
        return {
          kid,
          carryoverPct: Math.round(out.carryoverProgress * 100),
          currentWeekPct: Math.round(out.currentWeekProgress * 100),
          nextStarPct: Math.round(out.progressTowardNextStar * 100),
        };
      }),
    );
  }

  const weeks = await prisma.starWeek.findMany({
    where: { userId: me.id },
    orderBy: [{ weekStart: "desc" }],
    take: 12,
  });

  const earnedTotal = weeks.reduce((s, w) => s + (w.earned || 0), 0);
  const spentAgg = await prisma.starExchange.aggregate({
    where: { userId: me.id, status: "APPROVED" },
    _sum: { stars: true },
  });
  const spent = spentAgg._sum.stars || 0;
  const balance = Math.max(0, earnedTotal - spent);

  const requests = await prisma.starExchange.findMany({
    where: { userId: me.id },
    orderBy: [{ requestedAt: "desc" }],
    take: 10,
    select: { id: true, stars: true, note: true, status: true, requestedAt: true, reviewedAt: true },
  });

  return NextResponse.json({
    me: { id: me.id, role: me.role, username: me.username, name: me.name },
    weeks,
    balance,
    carryoverProgressPct: Math.round(carryoverProgress * 100),
    currentWeekProgressPct: Math.round(currentWeekProgress * 100),
    progressTowardNextStarPct: Math.round(progressTowardNextStar * 100),
    familyProgress,
    requests,
  });
}

export async function POST(req: Request) {
  const auth = await requireSessionUser();
  if ("status" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { me } = auth;

  if (me.role !== "KID") return NextResponse.json({ error: "Only kids can request exchanges" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const stars = Number(body?.stars || 0);
  const note = body?.note ? String(body.note).trim() : null;

  if (!Number.isFinite(stars) || stars <= 0) return NextResponse.json({ error: "Choose at least 1 star." }, { status: 400 });

  await recomputeStarWeeksForKid(me.id, me.familyId);

  // Check balance
  const weeks = await prisma.starWeek.findMany({ where: { userId: me.id } });
  const earnedTotal = weeks.reduce((s, w) => s + (w.earned || 0), 0);
  const spentAgg = await prisma.starExchange.aggregate({
    where: { userId: me.id, status: "APPROVED" },
    _sum: { stars: true },
  });
  const spent = spentAgg._sum.stars || 0;
  const balance = Math.max(0, earnedTotal - spent);

  if (stars > balance) return NextResponse.json({ error: "You do not have enough stars for that request." }, { status: 400 });

  const created = await prisma.starExchange.create({
    data: { userId: me.id, stars, note, status: "PENDING" } as any,
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: created.id });
}
