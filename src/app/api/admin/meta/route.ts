import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdult } from "@/lib/requireUser";

export async function GET() {
  const auth = await requireAdult({ source: "api/admin/meta.GET" });
  if ("status" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { me } = auth;

  const kids = await prisma.user.findMany({
    where: { familyId: me.familyId, role: "KID", isActive: true, isHidden: false },
    select: { id: true, name: true, email: true, avatarUrl: true },
    orderBy: [{ name: "asc" }, { email: "asc" }],
  });

  return NextResponse.json({ kids });
}
