import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, familyId: true, role: true, name: true, email: true },
  });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Return chores assigned to this user.
  // We keep it simple: "assigned chores" + whether there's a pending completion today.
  const chores = await prisma.chore.findMany({
    where: {
      familyId: user.familyId,
      active: true,
      assignments: { some: { userId: user.id } },
    },
    select: {
      id: true,
      title: true,
      description: true,
      points: true,
      active: true,
    },
    orderBy: { title: "asc" },
  });

  // Build a “today” window
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  // Find today's instances for those chores; if none exist yet, we’ll create “virtual instances” client-side.
  const instances = await prisma.choreInstance.findMany({
    where: {
      familyId: user.familyId,
      choreId: { in: chores.map((c) => c.id) },
      dueDate: { gte: start, lte: end },
    },
    select: {
      id: true,
      choreId: true,
      dueDate: true,
      completions: {
        where: { userId: user.id },
        select: { id: true, status: true, completedAt: true, pointsEarned: true },
        orderBy: { completedAt: "desc" },
        take: 1,
      },
    },
  });

  // Map choreId -> instance
  const byChore: Record<string, typeof instances[number]> = {};
  for (const inst of instances) byChore[inst.choreId] = inst;

  return NextResponse.json({
    me: user,
    chores: chores.map((c) => {
      const inst = byChore[c.id] ?? null;
      const completion = inst?.completions?.[0] ?? null;
      return {
        choreId: c.id,
        title: c.title,
        description: c.description,
        points: c.points,
        todayInstanceId: inst?.id ?? null,
        todayDueDate: inst?.dueDate ?? null,
        todayStatus: completion?.status ?? "NOT_DONE",
        todayCompletionId: completion?.id ?? null,
      };
    }),
  });
}
