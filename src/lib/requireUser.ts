import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireSessionUser() {
  const session = await getServerSession(authOptions);
  const uid = (session?.user as any)?.id as string | undefined;
  if (!uid) return { status: 401 as const, error: "Unauthorized" as const };

  const me = await prisma.user.findUnique({
    where: { id: uid },
    select: { id: true, role: true, familyId: true, username: true, name: true, avatarUrl: true },
  });

  if (!me) return { status: 401 as const, error: "Unauthorized" as const };
  return { me };
}

export async function requireAdult() {
  const r = await requireSessionUser();
  if ("status" in r) return r;
  if (r.me.role !== "ADULT") return { status: 403 as const, error: "Forbidden" as const };
  return r;
}
