import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

function toLocalDateStart(raw: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const [year, month, day] = raw.split("-").map((v) => Number(v));
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;

  const parsed = new Date(year, month - 1, day);
  parsed.setHours(0, 0, 0, 0);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;
  return parsed;
}

function isMissingRejectionReasonColumn(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== "P2022") return false;
  const message = String(error.message || "");
  return message.includes("rejectionReason");
}

export async function GET(req?: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, familyId: true, role: true, name: true, email: true },
  });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dateParam = req ? new URL(req.url).searchParams.get("date") : null;
  const selectedDayStart =
    typeof dateParam === "string" && dateParam.length > 0 ? toLocalDateStart(dateParam) : null;
  if (dateParam && !selectedDayStart) {
    return NextResponse.json({ error: "Invalid date. Use YYYY-MM-DD." }, { status: 400 });
  }

  const targetDayStart = selectedDayStart ?? (() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  })();
  const targetDayEnd = new Date(targetDayStart);
  targetDayEnd.setHours(23, 59, 59, 999);
  const targetDayOfWeek = targetDayStart.getDay();

  // Return chores assigned to this user.
  // Include chores due on the selected date (daily, matching weekly, or legacy unscheduled).
  const chores = await prisma.chore.findMany({
    where: {
      familyId: user.familyId,
      active: true,
      assignments: { some: { userId: user.id } },
      OR: [
        { schedules: { some: { frequency: "DAILY" } } },
        { schedules: { some: { frequency: "WEEKLY", dayOfWeek: targetDayOfWeek } } },
        { schedules: { none: {} } },
      ],
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

  // Find selected day's instances.
  const where = {
    familyId: user.familyId,
    choreId: { in: chores.map((c) => c.id) },
    dueDate: { gte: targetDayStart, lte: targetDayEnd },
  } as const;

  let hasRejectionReason = true;
  let instances: any[] = [];

  try {
    instances = await prisma.choreInstance.findMany({
      where,
      select: {
        id: true,
        choreId: true,
        dueDate: true,
        completions: {
          where: { userId: user.id },
          select: {
            id: true,
            status: true,
            completedAt: true,
            pointsEarned: true,
            rejectionReason: true,
          },
          orderBy: { completedAt: "desc" },
          take: 1,
        },
      },
    });
  } catch (error) {
    if (!isMissingRejectionReasonColumn(error)) throw error;
    hasRejectionReason = false;
    instances = await prisma.choreInstance.findMany({
      where,
      select: {
        id: true,
        choreId: true,
        dueDate: true,
        completions: {
          where: { userId: user.id },
          select: {
            id: true,
            status: true,
            completedAt: true,
            pointsEarned: true,
          },
          orderBy: { completedAt: "desc" },
          take: 1,
        },
      },
    });
  }

  // Map choreId -> instance
  const byChore: Record<string, typeof instances[number]> = {};
  for (const inst of instances) byChore[inst.choreId] = inst;

  return NextResponse.json({
    me: user,
    date: targetDayStart.toISOString(),
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
        todayRejectionReason: hasRejectionReason ? completion?.rejectionReason ?? null : null,
      };
    }),
  });
}
