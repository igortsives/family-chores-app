import { NextResponse } from "next/server";
import { requireAdult } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ChoreUpdate = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  points: z.number().int().min(0),
  active: z.boolean(),
  schedule: z.object({
    frequency: z.enum(["DAILY", "WEEKLY"]),
    dayOfWeek: z.number().int().min(0).max(6).optional(),
    timeOfDay: z.string().optional(),
  }),
  assignedUserIds: z.array(z.string()).default([]),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdult();
    const familyId = (session.user as any).familyId;

    const existing = await prisma.chore.findUnique({
      where: { id: params.id },
      include: { schedules: true, assignments: true },
    });
    if (!existing || existing.familyId !== familyId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const parsed = ChoreUpdate.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    await prisma.choreSchedule.deleteMany({ where: { choreId: params.id } });
    await prisma.choreAssignment.deleteMany({ where: { choreId: params.id } });

    const chore = await prisma.chore.update({
      where: { id: params.id },
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        points: parsed.data.points,
        active: parsed.data.active,
        schedules: { create: { ...parsed.data.schedule } },
        assignments: { create: parsed.data.assignedUserIds.map((userId) => ({ userId })) },
      },
      include: { schedules: true, assignments: { include: { user: true } } },
    });

    return NextResponse.json({ chore });
  } catch (e: any) {
    const msg = e?.message || "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdult();
    const familyId = (session.user as any).familyId;

    const existing = await prisma.chore.findUnique({ where: { id: params.id } });
    if (!existing || existing.familyId !== familyId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.choreAssignment.deleteMany({ where: { choreId: params.id } });
    await prisma.choreSchedule.deleteMany({ where: { choreId: params.id } });
    await prisma.choreInstance.deleteMany({ where: { choreId: params.id } });
    await prisma.chore.delete({ where: { id: params.id } });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message || "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
