import { NextResponse } from "next/server";
import { requireAdult } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ChoreCreate = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  points: z.number().int().min(0),
  active: z.boolean().optional(),
  schedule: z.object({
    frequency: z.enum(["DAILY", "WEEKLY"]),
    dayOfWeek: z.number().int().min(0).max(6).optional(),
    timeOfDay: z.string().optional(),
  }),
  assignedUserIds: z.array(z.string()).default([]),
});

export async function POST(req: Request) {
  try {
    const session = await requireAdult();
    const familyId = (session.user as any).familyId;

    const body = await req.json();
    const parsed = ChoreCreate.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const chore = await prisma.chore.create({
      data: {
        familyId,
        title: parsed.data.title,
        description: parsed.data.description,
        points: parsed.data.points,
        active: parsed.data.active ?? true,
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
