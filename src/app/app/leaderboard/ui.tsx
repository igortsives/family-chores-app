"use client";

import * as React from "react";
import { Stack, Typography, Tabs, Tab, Card, CardContent, Chip } from "@mui/material";

type Role = "ADULT" | "KID";
type Completion = { pointsEarned: number; status: "PENDING"|"APPROVED"|"REJECTED"; completedAt: string };
type User = { name?: string | null; email: string; role: Role; completions: Completion[]; awards: any[] };

function cutByPeriod(completions: Completion[], period: "7d"|"30d"|"all") {
  if (period === "all") return completions;
  const days = period === "7d" ? 7 : 30;
  const since = new Date(); since.setDate(since.getDate() - days);
  return completions.filter(c => new Date(c.completedAt) >= since);
}

export default function LeaderboardClient({ initialUsers }: { initialUsers: User[] }) {
  const [period, setPeriod] = React.useState<"7d"|"30d"|"all">("7d");
  const users = initialUsers;

  const rows = users.map(u => {
    const relevant = cutByPeriod(u.completions, period).filter(c => c.status === "APPROVED");
    const points = relevant.reduce((s, c) => s + c.pointsEarned, 0);
    const awardCount = u.awards.length; // awards are all-time; could add earnedAt filtering later
    return { name: u.name ?? u.email, role: u.role, points, awardCount };
  }).sort((a,b) => b.points - a.points);

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Leaderboard</Typography>

      <Tabs value={period} onChange={(_, v) => setPeriod(v)}>
        <Tab value="7d" label="Last 7 days" />
        <Tab value="30d" label="Last 30 days" />
        <Tab value="all" label="All time" />
      </Tabs>

      {rows.map(r => (
        <Card key={r.name}>
          <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <Typography variant="h6">{r.name}</Typography>
              <Typography variant="body2" color="text.secondary">{r.role}</Typography>
            </div>
            <Stack direction="row" spacing={1}>
              <Chip label={`${r.points} pts`} />
              {r.role === "KID" && <Chip label={`${r.awardCount} awards`} />}
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
