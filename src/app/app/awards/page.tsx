"use client";

import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

type StarWeek = { id: string; weekStart: string; earned: number };
type Exchange = {
  id: string;
  stars: number;
  note: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt: string;
};

function playfulStarProgressText(progressPctRaw: number) {
  const progressPct = Math.max(0, Math.min(100, Number(progressPctRaw || 0)));
  if (progressPct <= 0) return "A new star is waiting. Let’s get started!";

  const bucket = Math.min(100, Math.ceil(progressPct / 25) * 25);
  if (bucket === 25) return "Nice going! Keep it rolling.";
  if (bucket === 50) return "Halfway there. Keep it up!";
  if (bucket === 75) return "So close! Almost got another star.";
  return "Star unlocked vibe! Keep the streak rolling.";
}

export default function AwardsPage() {
  const [data, setData] = React.useState<any>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [animatedNextStarPct, setAnimatedNextStarPct] = React.useState(0);

  const [open, setOpen] = React.useState(false);
  const [stars, setStars] = React.useState<number>(1);
  const [note, setNote] = React.useState<string>("");

  async function load() {
    setErr(null);
    const res = await fetch("/api/stars", { cache: "no-store" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j?.error || `Failed (${res.status})`);
    setData(j);
  }

  React.useEffect(() => {
    load().catch((e) => setErr(String(e?.message || e)));
  }, []);

  async function requestExchange() {
    setErr(null);
    const res = await fetch("/api/stars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stars, note: note.trim() || null }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j?.error || "Request failed");
    setOpen(false);
    setStars(1);
    setNote("");
    await load();
  }

  const role = data?.me?.role as "ADULT" | "KID" | undefined;
  const isKidView = role === "KID";

  React.useEffect(() => {
    if (!isKidView || !data) return;
    const target = Math.max(0, Math.min(100, Number(data.progressTowardNextStarPct ?? 0)));
    setAnimatedNextStarPct(0);
    const timer = window.setTimeout(() => setAnimatedNextStarPct(target), 90);
    return () => window.clearTimeout(timer);
  }, [isKidView, data?.progressTowardNextStarPct, data]);

  function exchangeStatusLabel(status: Exchange["status"]) {
    if (status === "PENDING") return "Waiting";
    if (status === "REJECTED") return "Not approved";
    return "Approved";
  }

  return (
    <Container maxWidth="md" sx={{ pt: 0 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h4">{isKidView ? "Rewards" : "Awards"}</Typography>
          <Typography color="text.secondary">
            {isKidView
              ? "Your score progress stacks up over time toward stars. Keep going!"
              : "Stars build from weekly score progress and can carry over week to week."}
          </Typography>
        </Box>

        {err && <Alert severity="error">{err}</Alert>}

        {data && role === "KID" && (
          <Card variant="outlined">
            <CardContent>
              {(() => {
                const nextStarPct = Math.max(0, Math.min(100, Number(data.progressTowardNextStarPct ?? 0)));
                return (
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", sm: "center" }}
                  >
                    <Box>
                      <Typography variant="h6">Your stars</Typography>
                      <Typography color="text.secondary">Stars earned minus stars spent</Typography>
                      <Typography sx={{ mt: 0.5 }}>{playfulStarProgressText(nextStarPct)}</Typography>
                      <Tooltip title={`Next star: ${nextStarPct}%`} arrow>
                        <Box sx={{ mt: 1, maxWidth: 320 }}>
                          <LinearProgress
                            variant="determinate"
                            value={animatedNextStarPct}
                            sx={{
                              height: 7,
                              borderRadius: "999px",
                              bgcolor: "rgba(0,0,0,0.08)",
                              "& .MuiLinearProgress-bar": {
                                borderRadius: "999px",
                                transition: "transform 450ms ease",
                                backgroundImage: "linear-gradient(90deg, #ffa83e 0%, #ffcf69 100%)",
                              },
                            }}
                          />
                        </Box>
                      </Tooltip>
                    </Box>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip label={`${data.balance} ⭐`} color="primary" />
                      <Button variant="contained" onClick={() => setOpen(true)} disabled={data.balance <= 0}>
                        Trade stars
                      </Button>
                    </Stack>
                  </Stack>
                );
              })()}
            </CardContent>
          </Card>
        )}

      {data && role !== "KID" && (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1}>
              <Typography variant="h6">Kid star progress</Typography>
              <Typography color="text.secondary">
                Breakdown shown for parents only:
                {" "}
                carryover from prior weeks + current week progress = next star preview.
              </Typography>
              {(data.familyProgress as Array<any> | undefined)?.length ? (
                <Stack spacing={1}>
                  {data.familyProgress.map((row: any) => (
                    <Stack
                      key={row.kid.id}
                      direction={{ xs: "column", sm: "row" }}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", sm: "center" }}
                      gap={1}
                      sx={{ p: 1, borderRadius: 1.5, bgcolor: "rgba(0,0,0,0.02)" }}
                    >
                      <Typography sx={{ fontWeight: 700 }}>
                        {row.kid.name || row.kid.username || row.kid.id}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip size="small" label={`Carryover: ${row.carryoverPct}%`} />
                        <Chip size="small" label={`This week: ${row.currentWeekPct}%`} color="primary" variant="outlined" />
                        <Chip size="small" label={`Next star: ${row.nextStarPct}%`} color="warning" variant="outlined" />
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Alert severity="info">No kid progress available yet.</Alert>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">Stars by week</Typography>
          <Divider sx={{ my: 1.5 }} />
          <Stack spacing={1}>
            {(data?.weeks as StarWeek[] | undefined)?.length ? (
              data.weeks.map((w: StarWeek) => (
                <Stack key={w.id} direction="row" justifyContent="space-between" alignItems="center">
                  <Typography>Week of {String(w.weekStart).slice(0, 10)}</Typography>
                  <Chip label={w.earned > 0 ? `${w.earned} ⭐` : "—"} color={w.earned > 0 ? "success" : "default"} size="small" />
                </Stack>
              ))
            ) : (
              <Typography color="text.secondary">No weeks recorded yet.</Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      {role === "KID" && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6">Your star requests</Typography>
            <Divider sx={{ my: 1.5 }} />
            <Stack spacing={1}>
              {(data?.requests as Exchange[] | undefined)?.length ? (
                data.requests.map((r: Exchange) => (
                  <Stack
                    key={r.id}
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    gap={1}
                  >
                    <Typography>
                      {r.stars} ⭐ - {r.note || "Star request"}{" "}
                      <Typography component="span" color="text.secondary">
                        ({String(r.requestedAt).slice(0, 19).replace("T", " ")})
                      </Typography>
                    </Typography>
                    <Chip
                      label={exchangeStatusLabel(r.status)}
                      color={r.status === "APPROVED" ? "success" : r.status === "REJECTED" ? "error" : "warning"}
                      size="small"
                    />
                  </Stack>
                ))
              ) : (
                <Typography color="text.secondary">No star requests yet.</Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Trade stars</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="How many stars?"
                type="number"
                value={stars}
                onChange={(e) => setStars(Math.max(1, Number(e.target.value)))}
                inputProps={{ min: 1 }}
                fullWidth
              />
              <TextField
                label="What do you want? (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                fullWidth
              />
              <Alert severity="info">
                Your parent will approve the exchange and deduct stars from your balance.
              </Alert>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={requestExchange}>Send request</Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Container>
  );
}
