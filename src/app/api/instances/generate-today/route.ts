import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }

export async function POST() {
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const familyId = (session.user as any).familyId;
  const today = startOfDay(new Date());
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  const chores = await prisma.chore.findMany({
    where: { familyId, active: true },
    include: { schedules: true },
  });

  let created = 0;
  for (const chore of chores) {
    if (chore.schedules.length === 0) continue;

    const exists = await prisma.choreInstance.findFirst({
      where: { choreId: chore.id, familyId, dueDate: { gte: today, lt: tomorrow } },
    });

    if (!exists) {
      await prisma.choreInstance.create({ data: { choreId: chore.id, familyId, dueDate: today } });
      created++;
    }
  }

  return NextResponse.json({ ok: true, created });
}
