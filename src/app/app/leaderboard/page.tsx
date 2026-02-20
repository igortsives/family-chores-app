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
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

type Award = { id: string; name: string; icon: string | null; thresholdPoints: number };
type Row = {
  kid: { id: string; name: string | null; email: string };
  score: number;
  scorePct: number;
  completionRate: number;
  consistencyRate: number;
  streakFactor: number;
  expectedDue: number;
  approvedCount: number;
  possibleActiveDays: number;
  activeDays: number;
  weeklyPoints: number;
  points: number;
  streak: number;
  awardsEarned: Award[];
  nextAward: Award | null;
};

export default function LeaderboardPage() {
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

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
          Weekly ranking uses a hybrid score:
          {" "}
          70% completion rate + 20% consistency + 10% streak factor.
        </Typography>
        <Typography color="text.secondary">
          Weekly coins are shown for motivation and rewards, but do not change leaderboard rank.
        </Typography>
      </Box>

      {err && <Alert severity="error">{err}</Alert>}

      {!rows && (
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress size={22} />
          <Typography>Loading leaderboard…</Typography>
        </Stack>
      )}

      {rows?.length === 0 && <Alert severity="info">No kids to show yet.</Alert>}

      {rows?.map((r, idx) => (
        <Card key={r.kid.id} variant="outlined">
          <CardContent>
            <Stack spacing={1}>
              <Stack
                direction={isMobile ? "column" : "row"}
                justifyContent="space-between"
                alignItems={isMobile ? "stretch" : "center"}
                gap={1}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h6">
                    #{idx + 1} {r.kid.name || r.kid.email}
                  </Typography>
                  {isMobile ? (
                    <Box
                      sx={{
                        mt: 1,
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 0.5,
                      }}
                    >
                      <Chip
                        label={`Score ${r.scorePct}%`}
                        size="small"
                        color="warning"
                        variant="outlined"
                        sx={{ justifyContent: "center" }}
                      />
                      <Chip
                        label={`Complete ${Math.round(r.completionRate * 100)}%`}
                        size="small"
                        sx={{ justifyContent: "center" }}
                      />
                      <Chip
                        label={`Consistency ${Math.round(r.consistencyRate * 100)}%`}
                        size="small"
                        sx={{ justifyContent: "center" }}
                      />
                      <Chip
                        label={`${r.weeklyPoints} coins`}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ justifyContent: "center" }}
                      />
                    </Box>
                  ) : (
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center">
                      <Chip label={`${r.scorePct}% score`} size="small" color="warning" variant="outlined" />
                      <Chip label={`${Math.round(r.completionRate * 100)}% complete`} size="small" />
                      <Chip label={`${Math.round(r.consistencyRate * 100)}% consistency`} size="small" />
                      <Chip label={`${r.weeklyPoints} weekly coins`} size="small" color="primary" variant="outlined" />
                    </Stack>
                  )}
                </Box>
                {isMobile ? (
                  <Box
                    sx={{
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 1,
                      px: 1,
                      py: 0.75,
                      bgcolor: "action.hover",
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      {r.nextAward
                        ? `Next reward: ${r.nextAward.icon ?? "🏅"} ${r.nextAward.name} at ${r.nextAward.thresholdPoints} points`
                        : "All rewards unlocked"}
                    </Typography>
                  </Box>
                ) : r.nextAward ? (
                  <Chip
                    label={`Next: ${r.nextAward.icon ?? "🏅"} ${r.nextAward.name} @ ${r.nextAward.thresholdPoints} pts`}
                    size="small"
                    color="info"
                  />
                ) : (
                  <Chip label="All rewards unlocked 🎉" size="small" color="success" />
                )}
              </Stack>

              <Divider />

              <Stack direction={isMobile ? "column" : "row"} spacing={1} flexWrap="wrap" useFlexGap>
                <Typography color="text.secondary">
                  {r.approvedCount}/{r.expectedDue} chores approved this week, active on {r.activeDays}/{r.possibleActiveDays} assigned days.
                </Typography>
                <Chip label={`${r.streak}-day streak`} size="small" color={r.streak > 0 ? "success" : "default"} />
              </Stack>

              <Divider />

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {r.awardsEarned.length === 0 ? (
                  <Typography color="text.secondary">No rewards yet - keep going!</Typography>
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
