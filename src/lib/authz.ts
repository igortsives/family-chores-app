import { getServerSession } from "next-auth";

export async function requireSession() {
  const session = await getServerSession();
  if (!session?.user) throw new Error("UNAUTHORIZED");
  return session;
}

export async function requireAdult() {
  const session = await requireSession();
  const role = (session.user as any).role as "ADULT" | "KID";
  if (role !== "ADULT") throw new Error("FORBIDDEN");
  return session;
}
