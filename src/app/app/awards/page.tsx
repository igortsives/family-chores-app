"use client";

import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
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

export default function AwardsPage() {
  const [data, setData] = React.useState<any>(null);
  const [err, setErr] = React.useState<string | null>(null);

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

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h4">Awards</Typography>
        <Typography color="text.secondary">
          Weekly Stars: complete all assigned chores for the week to earn a Star.
        </Typography>
      </Box>

      {err && <Alert severity="error">{err}</Alert>}

      {data && role === "KID" && (
        <Card variant="outlined">
          <CardContent>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
            >
              <Box>
                <Typography variant="h6">Star balance</Typography>
                <Typography color="text.secondary">Earned – exchanged</Typography>
              </Box>

              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label={`${data.balance} ⭐`} color="primary" />
                <Button variant="contained" onClick={() => setOpen(true)} disabled={data.balance <= 0}>
                  Exchange stars
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      {data && role !== "KID" && (
        <Alert severity="info">
          Parents approve exchanges in <b>Star exchanges</b>. Kids earn Stars weekly.
        </Alert>
      )}

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">Stars earned by week</Typography>
          <Divider sx={{ my: 1.5 }} />
          <Stack spacing={1}>
            {(data?.weeks as StarWeek[] | undefined)?.length ? (
              data.weeks.map((w: StarWeek) => (
                <Stack key={w.id} direction="row" justifyContent="space-between" alignItems="center">
                  <Typography>Week of {String(w.weekStart).slice(0, 10)}</Typography>
                  <Chip label={w.earned ? "⭐ Earned" : "—"} color={w.earned ? "success" : "default"} size="small" />
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
            <Typography variant="h6">Exchange requests</Typography>
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
                      {r.stars} ⭐ — {r.note || "Exchange request"}{" "}
                      <Typography component="span" color="text.secondary">
                        ({String(r.requestedAt).slice(0, 19).replace("T", " ")})
                      </Typography>
                    </Typography>
                    <Chip
                      label={r.status}
                      color={r.status === "APPROVED" ? "success" : r.status === "REJECTED" ? "error" : "warning"}
                      size="small"
                    />
                  </Stack>
                ))
              ) : (
                <Typography color="text.secondary">No exchange requests yet.</Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Exchange Stars</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Stars to exchange"
              type="number"
              value={stars}
              onChange={(e) => setStars(Math.max(1, Number(e.target.value)))}
              inputProps={{ min: 1 }}
              fullWidth
            />
            <TextField
              label="What are you exchanging for? (optional)"
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
          <Button variant="contained" onClick={requestExchange}>Request</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
