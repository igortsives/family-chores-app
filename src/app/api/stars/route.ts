import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/requireUser";
import { addDays, startOfWeekMonday } from "@/lib/week";

/**
 * Assumes your schema has:
 * - StarWeek (userId, weekStart, earned)
 * - StarExchange (userId, stars, status, note)
 * And existing chore models:
 * - choreInstance: assignedToId, scheduledFor
 * - choreCompletion: userId, choreInstanceId, status ("APPROVED")
 */

async function computeStarForWeek(userId: string, weekStart: Date) {
  const weekEnd = addDays(weekStart, 7);

  // 1) Find chores assigned to this kid (weekly schedule is represented via instances + dueDate)
  // NOTE: We use `as any` so this compiles even if your ChoreAssignment has extra fields.
  const assignments = await (prisma as any).choreAssignment
    .findMany({
      where: { userId },
      select: { choreId: true },
    })
    .catch(() => []);

  const choreIds = Array.from(new Set((assignments || []).map((a: any) => a.choreId).filter(Boolean)));

  if (choreIds.length === 0) {
    await prisma.starWeek.upsert({
      where: { userId_weekStart: { userId, weekStart } } as any,
      create: { userId, weekStart, earned: 0 },
      update: { earned: 0, computedAt: new Date() } as any,
    });
    return 0;
  }

  // 2) Find instances due within the week for those assigned chores
  const instances = await prisma.choreInstance.findMany({
    where: {
      choreId: { in: choreIds },
      dueDate: { gte: weekStart, lt: weekEnd },
    } as any,
    select: { id: true },
  });

  if (instances.length === 0) {
    await prisma.starWeek.upsert({
      where: { userId_weekStart: { userId, weekStart } } as any,
      create: { userId, weekStart, earned: 0 },
      update: { earned: 0, computedAt: new Date() } as any,
    });
    return 0;
  }

  const ids = instances.map((x) => x.id);

  // 3) Count APPROVED completions for this kid for those instances
  const approvedCount = await prisma.choreCompletion.count({
    where: {
      userId,
      choreInstanceId: { in: ids },
      status: "APPROVED",
    } as any,
  });

  const earned = approvedCount === ids.length ? 1 : 0;

  await prisma.starWeek.upsert({
    where: { userId_weekStart: { userId, weekStart } } as any,
    create: { userId, weekStart, earned },
    update: { earned, computedAt: new Date() } as any,
  });

  return earned;
}

export async function GET() {
  const auth = await requireSessionUser();
  if ("status" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { me } = auth;

  const now = new Date();
  const currentWeekStart = startOfWeekMonday(now);
  const lastWeekStart = addDays(currentWeekStart, -7);

  if (me.role === "KID") {
    await computeStarForWeek(me.id, lastWeekStart);
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
