import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import ApprovalsClient from "./ui";

export default async function ApprovalsPage() {
  const session = await getServerSession();
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role as "ADULT" | "KID";
  if (role !== "ADULT") redirect("/app");
  return <ApprovalsClient />;
}
