import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncKidReminderNotificationsForFamily } from "@/lib/notifications";
import { requireAdult } from "@/lib/requireUser";

type Frequency = "DAILY" | "WEEKLY";

export async function GET() {
  const auth = await requireAdult({ source: "api/admin/chores.GET" });
  if ("status" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { me } = auth;

  const chores = await prisma.chore.findMany({
    where: { familyId: me.familyId },
    select: {
      id: true,
      title: true,
      description: true,
      points: true,
      active: true,
      assignments: {
        select: {
          userId: true,
          user: { select: { role: true } },
        },
      },
      schedules: { select: { id: true, frequency: true, dayOfWeek: true } },
    },
    orderBy: [{ active: "desc" }, { title: "asc" }],
  });

  return NextResponse.json({
    chores: chores.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      points: c.points,
      active: c.active,
      assignedKidIds: c.assignments.filter((a) => a.user.role === "KID").map((a) => a.userId),
      schedule: c.schedules[0]
        ? { frequency: c.schedules[0].frequency as Frequency, dayOfWeek: c.schedules[0].dayOfWeek ?? null }
        : { frequency: "DAILY" as Frequency, dayOfWeek: null },
    })),
  });
}

export async function POST(req: Request) {
  const auth = await requireAdult({ source: "api/admin/chores.POST" });
  if ("status" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { me } = auth;

  const body = await req.json().catch(() => ({}));
  const title = String(body?.title ?? "").trim();
  const description = body?.description ? String(body.description) : null;
  const points = Number(body?.points ?? 1);
  const active = body?.active !== false;

  const assignedKidIds: string[] = Array.isArray(body?.assignedKidIds) ? body.assignedKidIds : [];
  const frequency: Frequency = body?.frequency === "WEEKLY" ? "WEEKLY" : "DAILY";
  const dayOfWeek: number | null =
    frequency === "WEEKLY" && typeof body?.dayOfWeek === "number" ? body.dayOfWeek : null;

  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });
  if (!Number.isFinite(points) || points < 0) return NextResponse.json({ error: "Invalid points" }, { status: 400 });
  if (frequency === "WEEKLY" && (dayOfWeek === null || dayOfWeek < 0 || dayOfWeek > 6)) {
    return NextResponse.json({ error: "Invalid dayOfWeek (0=Sun..6=Sat)" }, { status: 400 });
  }

  if (assignedKidIds.length) {
    const count = await prisma.user.count({
      where: { id: { in: assignedKidIds }, familyId: me.familyId, role: "KID" },
    });
    if (count !== assignedKidIds.length) return NextResponse.json({ error: "Invalid kid assignment" }, { status: 400 });
  }

  const chore = await prisma.chore.create({
    data: {
      familyId: me.familyId,
      title,
      description,
      points,
      active,
      schedules: { create: { frequency, dayOfWeek } },
      assignments: { create: assignedKidIds.map((userId) => ({ userId })) },
    },
    select: { id: true },
  });

  await syncKidReminderNotificationsForFamily(me.familyId);

  return NextResponse.json({ ok: true, id: chore.id });
}

export async function PUT(req: Request) {
  const auth = await requireAdult({ source: "api/admin/chores.PUT" });
  if ("status" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { me } = auth;

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const exists = await prisma.chore.findFirst({ where: { id, familyId: me.familyId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const title = String(body?.title ?? "").trim();
  const description = body?.description ? String(body.description) : null;
  const points = Number(body?.points ?? 1);
  const active = body?.active !== false;

  const assignedKidIds: string[] = Array.isArray(body?.assignedKidIds) ? body.assignedKidIds : [];
  const frequency: Frequency = body?.frequency === "WEEKLY" ? "WEEKLY" : "DAILY";
  const dayOfWeek: number | null =
    frequency === "WEEKLY" && typeof body?.dayOfWeek === "number" ? body.dayOfWeek : null;

  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });
  if (!Number.isFinite(points) || points < 0) return NextResponse.json({ error: "Invalid points" }, { status: 400 });
  if (frequency === "WEEKLY" && (dayOfWeek === null || dayOfWeek < 0 || dayOfWeek > 6)) {
    return NextResponse.json({ error: "Invalid dayOfWeek (0=Sun..6=Sat)" }, { status: 400 });
  }

  if (assignedKidIds.length) {
    const count = await prisma.user.count({
      where: { id: { in: assignedKidIds }, familyId: me.familyId, role: "KID" },
    });
    if (count !== assignedKidIds.length) return NextResponse.json({ error: "Invalid kid assignment" }, { status: 400 });
  }

  await prisma.chore.update({
    where: { id },
    data: { title, description, points, active },
  });

  await prisma.choreSchedule.deleteMany({ where: { choreId: id } });
  await prisma.choreSchedule.create({
    data: { choreId: id, frequency, dayOfWeek, timeOfDay: null },
  });

  await prisma.choreAssignment.deleteMany({ where: { choreId: id } });
  if (assignedKidIds.length) {
    await prisma.choreAssignment.createMany({
      data: assignedKidIds.map((userId) => ({ choreId: id, userId })),
    });
  }

  await syncKidReminderNotificationsForFamily(me.familyId);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const auth = await requireAdult({ source: "api/admin/chores.DELETE" });
  if ("status" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { me } = auth;

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const exists = await prisma.chore.findFirst({ where: { id, familyId: me.familyId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.choreAssignment.deleteMany({ where: { choreId: id } });
  await prisma.choreSchedule.deleteMany({ where: { choreId: id } });
  await prisma.choreInstance.deleteMany({ where: { choreId: id } });
  await prisma.chore.delete({ where: { id } });

  await syncKidReminderNotificationsForFamily(me.familyId);

  return NextResponse.json({ ok: true });
}
