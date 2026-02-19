import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, familyId: true, role: true },
  });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const choreId: string | undefined = body?.choreId;
  const instanceId: string | null | undefined = body?.instanceId;

  if (!choreId) return NextResponse.json({ error: "Missing choreId" }, { status: 400 });

  // Ensure chore belongs to family and user is assigned
  const chore = await prisma.chore.findFirst({
    where: {
      id: choreId,
      familyId: user.familyId,
      active: true,
      assignments: { some: { userId: user.id } },
    },
    select: { id: true, points: true, familyId: true },
  });
  if (!chore) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Determine "today"
  const now = new Date();
  const start = new Date(now); start.setHours(0,0,0,0);
  const end = new Date(now); end.setHours(23,59,59,999);

  // Use existing instance if provided and valid; else find/create today's instance.
  let inst = null as null | { id: string };
  if (instanceId) {
    const found = await prisma.choreInstance.findFirst({
      where: { id: instanceId, choreId: chore.id, familyId: user.familyId, dueDate: { gte: start, lte: end } },
      select: { id: true },
    });
    if (found) inst = found;
  }
  if (!inst) {
    const existing = await prisma.choreInstance.findFirst({
      where: { choreId: chore.id, familyId: user.familyId, dueDate: { gte: start, lte: end } },
      select: { id: true },
    });
    if (existing) inst = existing;
    else {
      inst = await prisma.choreInstance.create({
        data: { choreId: chore.id, familyId: user.familyId, dueDate: now },
        select: { id: true },
      });
    }
  }

  // Create a completion (PENDING approval for kids; adults could auto-approve, but you said adults don't need awards—still keep approval logic simple)
  const isKid = user.role === "KID";
  const status = isKid ? "PENDING" : "APPROVED";

  // If already completed today with PENDING/APPROVED, return current status.
  // If latest status is REJECTED, allow a new submission.
  const existingCompletion = await prisma.choreCompletion.findFirst({
    where: { choreInstanceId: inst.id, userId: user.id },
    orderBy: { completedAt: "desc" },
    select: { id: true, status: true },
  });
  if (existingCompletion && existingCompletion.status !== "REJECTED") {
    return NextResponse.json({ ok: true, completionId: existingCompletion.id, status: existingCompletion.status });
  }

  const completion = await prisma.choreCompletion.create({
    data: {
      choreInstanceId: inst.id,
      userId: user.id,
      status,
      pointsEarned: chore.points,
      ...(status === "APPROVED" ? { approvedAt: new Date(), approvedById: user.id } : {}),
    },
    select: { id: true, status: true },
  });

  return NextResponse.json({ ok: true, completionId: completion.id, status: completion.status });
}
