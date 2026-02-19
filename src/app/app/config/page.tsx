import { redirect } from "next/navigation";

export default async function ConfigPage() {
  redirect("/app/admin/chores");
}
