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
  if (user.role !== "KID") return NextResponse.json({ error: "Only kids can undo completion" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const completionId = String(body?.completionId ?? "").trim();
  if (!completionId) return NextResponse.json({ error: "Missing completionId" }, { status: 400 });

  const deleted = await prisma.choreCompletion.deleteMany({
    where: {
      id: completionId,
      userId: user.id,
      status: "PENDING",
      choreInstance: { familyId: user.familyId },
    },
  });
  if (deleted.count > 0) return NextResponse.json({ ok: true, status: "NOT_DONE" });

  const completion = await prisma.choreCompletion.findFirst({
    where: {
      id: completionId,
      userId: user.id,
      choreInstance: { familyId: user.familyId },
    },
    select: { status: true },
  });
  if (!completion) return NextResponse.json({ error: "Completion not found" }, { status: 404 });
  if (completion.status === "APPROVED") {
    return NextResponse.json({ error: "Cannot undo after parent approval" }, { status: 400 });
  }
  if (completion.status !== "PENDING") {
    return NextResponse.json({ error: "Only pending completions can be undone" }, { status: 400 });
  }

  return NextResponse.json({ error: "Unable to undo completion" }, { status: 409 });
}
