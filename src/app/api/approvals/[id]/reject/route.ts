import { NextResponse } from "next/server";
import { requireAdult } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdult();
    const familyId = (session.user as any).familyId;
    const approverId = (session.user as any).id;

    const comp = await prisma.choreCompletion.findUnique({
      where: { id: params.id },
      include: { user: true },
    });
    if (!comp || comp.user.familyId !== familyId) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (comp.status !== "PENDING") return NextResponse.json({ error: "Not pending" }, { status: 400 });

    await prisma.choreCompletion.update({
      where: { id: params.id },
      data: { status: "REJECTED", approvedAt: new Date(), approvedById: approverId },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message || "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
