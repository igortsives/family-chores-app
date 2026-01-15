import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role as "ADULT" | "KID";
  if (role !== "KID") return NextResponse.json({ error: "Only kids submit for approval" }, { status: 403 });

  const { choreInstanceId } = await req.json();
  const userId = (session.user as any).id;
  const familyId = (session.user as any).familyId;

  const instance = await prisma.choreInstance.findFirst({
    where: { id: choreInstanceId, familyId },
    include: { chore: true, completions: true },
  });
  if (!instance) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const assigned = await prisma.choreAssignment.findFirst({ where: { choreId: instance.choreId, userId } });
  if (!assigned) return NextResponse.json({ error: "Not assigned" }, { status: 403 });

  const already = await prisma.choreCompletion.findFirst({ where: { choreInstanceId, userId } });
  if (already) return NextResponse.json({ error: "Already submitted" }, { status: 400 });

  const completion = await prisma.choreCompletion.create({
    data: {
      choreInstanceId,
      userId,
      status: "PENDING",
      pointsEarned: instance.chore.points,
    },
  });

  return NextResponse.json({ completion });
}
