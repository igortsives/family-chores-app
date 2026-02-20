"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

type StatsRow = {
  rank: number;
  kid: { id: string; name: string | null; username: string | null; email: string };
  scorePct: number;
  completionPct: number;
  consistencyPct: number;
  streakDays: number;
  approvedThisWeek: number;
  expectedThisWeek: number;
  weeklyCoins: number;
  lifetimeCoins: number;
  starsEarned: number;
  starBalance: number;
  carryoverPct: number;
  currentWeekPct: number;
  nextStarPct: number;
  awardsUnlocked: number;
};

type StatsResponse = {
  rows: StatsRow[];
  totals: {
    participants: number;
    weeklyCoins: number;
    lifetimeCoins: number;
    starsEarned: number;
    starsBalance: number;
    approvedThisWeek: number;
    expectedThisWeek: number;
    overallCompletionPct: number;
    overallConsistencyPct: number;
    avgScorePct: number;
    avgNextStarPct: number;
  };
  meta: {
    weekStart: string;
    weekEnd: string;
    weights: {
      completionRate: number;
      consistencyRate: number;
      streakFactor: number;
    };
  };
};

export default function FamilyStatsPage() {
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: "ADULT" | "KID" } | undefined)?.role;
  const [data, setData] = React.useState<StatsResponse | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  async function load() {
    setErr(null);
    const res = await fetch("/api/admin/family-stats", { cache: "no-store" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j?.error || `Failed (${res.status})`);
    setData(j as StatsResponse);
  }

  React.useEffect(() => {
    if (status === "authenticated" && role === "ADULT") {
      load().catch((e) => setErr(String(e?.message || e)));
    }
  }, [status, role]);

  if (status === "loading") {
    return (
      <Stack direction="row" spacing={2} alignItems="center">
        <CircularProgress size={22} />
        <Typography>Loading…</Typography>
      </Stack>
    );
  }

  if (status === "authenticated" && role !== "ADULT") {
    return <Alert severity="warning">Parents only.</Alert>;
  }

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h4">Family stats</Typography>
        <Typography color="text.secondary">
          One place for coins, stars, and percentage-based performance across all participating kids.
        </Typography>
      </Box>

      {err && <Alert severity="error">{err}</Alert>}

      {!data && !err && (
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress size={22} />
          <Typography>Loading family stats…</Typography>
        </Stack>
      )}

      {data && (
        <Stack spacing={2}>
          <Alert severity="info">
            Score formula: {Math.round(data.meta.weights.completionRate * 100)}% completion +{" "}
            {Math.round(data.meta.weights.consistencyRate * 100)}% consistency +{" "}
            {Math.round(data.meta.weights.streakFactor * 100)}% streak.
          </Alert>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap flexWrap="wrap">
            <Card variant="outlined" sx={{ minWidth: 170 }}>
              <CardContent sx={{ py: 1.2, "&:last-child": { pb: 1.2 } }}>
                <Typography variant="caption" color="text.secondary">Participants</Typography>
                <Typography variant="h6">{data.totals.participants}</Typography>
              </CardContent>
            </Card>
            <Card variant="outlined" sx={{ minWidth: 170 }}>
              <CardContent sx={{ py: 1.2, "&:last-child": { pb: 1.2 } }}>
                <Typography variant="caption" color="text.secondary">Weekly coins</Typography>
                <Typography variant="h6">{data.totals.weeklyCoins}</Typography>
              </CardContent>
            </Card>
            <Card variant="outlined" sx={{ minWidth: 170 }}>
              <CardContent sx={{ py: 1.2, "&:last-child": { pb: 1.2 } }}>
                <Typography variant="caption" color="text.secondary">Stars balance</Typography>
                <Typography variant="h6">{data.totals.starsBalance}</Typography>
              </CardContent>
            </Card>
            <Card variant="outlined" sx={{ minWidth: 170 }}>
              <CardContent sx={{ py: 1.2, "&:last-child": { pb: 1.2 } }}>
                <Typography variant="caption" color="text.secondary">Avg score</Typography>
                <Typography variant="h6">{data.totals.avgScorePct}%</Typography>
              </CardContent>
            </Card>
            <Card variant="outlined" sx={{ minWidth: 170 }}>
              <CardContent sx={{ py: 1.2, "&:last-child": { pb: 1.2 } }}>
                <Typography variant="caption" color="text.secondary">Overall completion</Typography>
                <Typography variant="h6">{data.totals.overallCompletionPct}%</Typography>
              </CardContent>
            </Card>
            <Card variant="outlined" sx={{ minWidth: 170 }}>
              <CardContent sx={{ py: 1.2, "&:last-child": { pb: 1.2 } }}>
                <Typography variant="caption" color="text.secondary">Avg next star</Typography>
                <Typography variant="h6">{data.totals.avgNextStarPct}%</Typography>
              </CardContent>
            </Card>
          </Stack>

          {data.rows.length === 0 && (
            <Alert severity="info">No active, visible kids found for this family.</Alert>
          )}

          {data.rows.length > 0 && (
            isMobile ? (
              <Stack spacing={1}>
                {data.rows.map((row) => (
                  <Card key={row.kid.id} variant="outlined">
                    <CardContent sx={{ py: 1.2, "&:last-child": { pb: 1.2 } }}>
                      <Stack spacing={0.8}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          #{row.rank} {row.kid.name || row.kid.username || row.kid.email}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          @{row.kid.username || "kid"} · {row.kid.email}
                        </Typography>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          <Chip size="small" label={`Score ${row.scorePct}%`} color="warning" variant="outlined" />
                          <Chip size="small" label={`Coins ${row.weeklyCoins}/${row.lifetimeCoins}`} color="primary" variant="outlined" />
                          <Chip size="small" label={`Stars ${row.starBalance}/${row.starsEarned}`} color="secondary" variant="outlined" />
                          <Chip size="small" label={`Next star ${row.nextStarPct}%`} />
                          <Chip size="small" label={`Complete ${row.completionPct}%`} />
                          <Chip size="small" label={`Consistency ${row.consistencyPct}%`} />
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : (
              <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}>
                <Table size="small" aria-label="family stats table">
                  <TableHead>
                    <TableRow>
                      <TableCell>Rank</TableCell>
                      <TableCell>Member</TableCell>
                      <TableCell align="right">Weekly coins</TableCell>
                      <TableCell align="right">Lifetime coins</TableCell>
                      <TableCell align="right">Stars (balance/earned)</TableCell>
                      <TableCell align="right">Score %</TableCell>
                      <TableCell align="right">Complete %</TableCell>
                      <TableCell align="right">Consistency %</TableCell>
                      <TableCell align="right">Next star %</TableCell>
                      <TableCell align="right">Awards</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.rows.map((row) => (
                      <TableRow key={row.kid.id} hover>
                        <TableCell>#{row.rank}</TableCell>
                        <TableCell sx={{ minWidth: 220 }}>
                          <Typography sx={{ fontWeight: 600 }}>{row.kid.name || row.kid.username || row.kid.email}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            @{row.kid.username || "kid"} · {row.kid.email}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{row.weeklyCoins}</TableCell>
                        <TableCell align="right">{row.lifetimeCoins}</TableCell>
                        <TableCell align="right">{row.starBalance}/{row.starsEarned}</TableCell>
                        <TableCell align="right">{row.scorePct}%</TableCell>
                        <TableCell align="right">{row.completionPct}%</TableCell>
                        <TableCell align="right">{row.consistencyPct}%</TableCell>
                        <TableCell align="right">
                          {row.nextStarPct}%
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                            C{row.carryoverPct} + W{row.currentWeekPct}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{row.awardsUnlocked}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )
          )}
        </Stack>
      )}
    </Stack>
  );
}
