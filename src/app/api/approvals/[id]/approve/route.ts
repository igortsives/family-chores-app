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

    const updated = await prisma.choreCompletion.update({
      where: { id: params.id },
      data: { status: "APPROVED", approvedAt: new Date(), approvedById: approverId },
    });

    // Grant awards on approval only (kid-only)
    if (comp.user.role === "KID") {
      const totals = await prisma.choreCompletion.aggregate({
        where: { userId: comp.userId, status: "APPROVED" },
        _sum: { pointsEarned: true },
      });
      const totalPoints = totals._sum.pointsEarned ?? 0;

      const awards = await prisma.award.findMany({ where: { familyId } });
      const existing = await prisma.userAward.findMany({ where: { userId: comp.userId } });
      const have = new Set(existing.map(a => a.awardId));

      const toGrant = awards.filter(a => totalPoints >= a.thresholdPoints && !have.has(a.id));
      if (toGrant.length) {
        await prisma.userAward.createMany({
          data: toGrant.map(a => ({ userId: comp.userId, awardId: a.id, completionId: updated.id })),
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message || "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
