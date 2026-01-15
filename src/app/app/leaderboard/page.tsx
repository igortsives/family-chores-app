"use client";

import * as React from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material";

type Award = { id: string; name: string; icon: string | null; thresholdPoints: number };
type Row = {
  kid: { id: string; name: string | null; email: string };
  points: number;
  streak: number;
  awardsEarned: Award[];
  nextAward: Award | null;
};

export default function LeaderboardPage() {
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  async function load() {
    setErr(null);
    const res = await fetch("/api/leaderboard", { cache: "no-store" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j?.error || `Failed (${res.status})`);
    setRows(j.rows);
  }

  React.useEffect(() => {
    load().catch((e) => setErr(String(e?.message || e)));
  }, []);

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h4">Leaderboard</Typography>
        <Typography color="text.secondary">
          Points are based on <b>approved</b> completions. Streak = consecutive days with at least one approved completion.
        </Typography>
      </Box>

      {err && <Alert severity="error">{err}</Alert>}

      {!rows && (
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress size={22} />
          <Typography>Loading leaderboard…</Typography>
        </Stack>
      )}

      {rows?.length === 0 && <Alert severity="info">No kids found in this family.</Alert>}

      {rows?.map((r, idx) => (
        <Card key={r.kid.id} variant="outlined">
          <CardContent>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                <Box>
                  <Typography variant="h6">
                    #{idx + 1} {r.kid.name || r.kid.email}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center">
                    <Chip label={`${r.points} pts`} size="small" />
                    <Chip label={`${r.streak} day streak`} size="small" color={r.streak > 0 ? "success" : "default"} />
                  </Stack>
                </Box>
                {r.nextAward ? (
                  <Chip
                    label={`Next: ${r.nextAward.icon ?? "🏅"} ${r.nextAward.name} @ ${r.nextAward.thresholdPoints} pts`}
                    size="small"
                    color="info"
                  />
                ) : (
                  <Chip label="All awards earned 🎉" size="small" color="success" />
                )}
              </Stack>

              <Divider />

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {r.awardsEarned.length === 0 ? (
                  <Typography color="text.secondary">No awards yet.</Typography>
                ) : (
                  r.awardsEarned.map((a) => (
                    <Chip key={a.id} label={`${a.icon ?? "🏅"} ${a.name}`} size="small" />
                  ))
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
