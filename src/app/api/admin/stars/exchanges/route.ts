import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdult } from "@/lib/requireUser";

export async function GET() {
  const auth = await requireAdult();
  if ("status" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { me } = auth;

  const exchanges = await prisma.starExchange.findMany({
    where: { user: { familyId: me.familyId } } as any,
    orderBy: [{ requestedAt: "desc" }],
    take: 50,
    select: {
      id: true,
      stars: true,
      note: true,
      status: true,
      requestedAt: true,
      reviewedAt: true,
      user: { select: { id: true, name: true, username: true, role: true } } as any,
      reviewedBy: { select: { id: true, name: true, username: true } } as any,
    } as any,
  });

  return NextResponse.json({ exchanges });
}

export async function POST(req: Request) {
  const auth = await requireAdult();
  if ("status" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { me } = auth;

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id || "");
  const action = String(body?.action || "");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (!["APPROVE", "REJECT"].includes(action)) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  const ex = await prisma.starExchange.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true, user: { select: { familyId: true } } as any },
  });

  if (!ex) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ex.user.familyId !== me.familyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const nextStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

  await prisma.starExchange.update({
    where: { id },
    data: {
      status: nextStatus as any,
      reviewedAt: new Date(),
      reviewedBy: { connect: { id: me.id } } as any,
    } as any,
  });

  return NextResponse.json({ ok: true });
}
