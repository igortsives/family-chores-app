import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Stack, Typography, Card, CardContent, Chip } from "@mui/material";

export default async function ProgressPage() {
  const session = await getServerSession();
  if (!session?.user) redirect("/login");
  const familyId = (session.user as any).familyId;

  const recent = await prisma.choreCompletion.findMany({
    where: { user: { familyId } },
    include: { user: true, choreInstance: { include: { chore: true } } },
    orderBy: { completedAt: "desc" },
    take: 40,
  });

  const chip = (s: string) =>
    s === "APPROVED" ? <Chip color="success" label="Approved" /> :
    s === "REJECTED" ? <Chip color="error" label="Rejected" /> :
    <Chip color="warning" label="Pending" />;

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Recent Progress</Typography>
      {recent.map(c => (
        <Card key={c.id}>
          <CardContent sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
            <div>
              <Typography>
                <b>{c.user.name ?? c.user.email}</b> • <b>{c.choreInstance.chore.title}</b> (+{c.pointsEarned})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {new Date(c.completedAt).toLocaleString()}
              </Typography>
            </div>
            {chip(c.status)}
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
