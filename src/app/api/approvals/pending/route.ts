import { NextResponse } from "next/server";
import { requireAdult } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireAdult();
    const familyId = (session.user as any).familyId;

    const pending = await prisma.choreCompletion.findMany({
      where: { status: "PENDING", user: { familyId } },
      include: {
        user: true,
        choreInstance: { include: { chore: true } },
      },
      orderBy: { completedAt: "asc" },
      take: 200,
    });

    return NextResponse.json({ pending });
  } catch (e: any) {
    const msg = e?.message || "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
