import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { email },
    select: { id: true, familyId: true, role: true },
  });
  if (!me || me.role !== "ADULT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const kids = await prisma.user.findMany({
    where: { familyId: me.familyId, role: "KID", isActive: true, isHidden: false },
    select: { id: true, name: true, email: true },
    orderBy: [{ name: "asc" }, { email: "asc" }],
  });

  return NextResponse.json({ kids });
}
