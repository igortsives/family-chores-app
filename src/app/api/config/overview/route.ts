import { NextResponse } from "next/server";
import { requireAdult } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireAdult();
    const familyId = (session.user as any).familyId;

    const users = await prisma.user.findMany({ where: { familyId }, orderBy: { createdAt: "asc" } });
    const awards = await prisma.award.findMany({ where: { familyId }, orderBy: { thresholdPoints: "asc" } });
    const chores = await prisma.chore.findMany({
      where: { familyId },
      include: { schedules: true, assignments: { include: { user: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ users, awards, chores });
  } catch (e: any) {
    const msg = e?.message || "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
