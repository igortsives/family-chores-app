"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Stack,
  Typography,
  Chip,
} from "@mui/material";

type Row = {
  choreId: string;
  title: string;
  description: string | null;
  points: number;
  todayInstanceId: string | null;
  todayStatus: "NOT_DONE" | "PENDING" | "APPROVED" | "REJECTED" | string;
};

export default function MyChoresPage() {
  const { status } = useSession();
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<Record<string, boolean>>({});

  async function load() {
    setErr(null);
    const res = await fetch("/api/my-chores", { cache: "no-store" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j?.error || `Failed to load (${res.status})`);
    }
    const data = await res.json();
    setRows(data.chores);
  }

  React.useEffect(() => {
    if (status === "authenticated") load().catch((e) => setErr(String(e?.message || e)));
  }, [status]);

  async function markDone(r: Row) {
    setBusy((b) => ({ ...b, [r.choreId]: true }));
    setErr(null);
    try {
      const res = await fetch("/api/chores/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choreId: r.choreId, instanceId: r.todayInstanceId }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || `Failed (${res.status})`);
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusy((b) => ({ ...b, [r.choreId]: false }));
    }
  }

  const statusChip = (s: string) => {
    if (s === "APPROVED") return <Chip label="Approved" color="success" size="small" />;
    if (s === "PENDING") return <Chip label="Pending approval" color="warning" size="small" />;
    if (s === "REJECTED") return <Chip label="Rejected" color="error" size="small" />;
    if (s === "NOT_DONE") return <Chip label="Not done" size="small" />;
    return <Chip label={s} size="small" />;
  };

  if (status === "loading") {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress size={22} />
          <Typography>Loading session…</Typography>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h4">My chores</Typography>
          <Typography color="text.secondary">
            Mark chores done. If you’re a kid, an adult must approve.
          </Typography>
        </Box>

        {err && <Alert severity="error">{err}</Alert>}

        {!rows && (
          <Stack direction="row" spacing={2} alignItems="center">
            <CircularProgress size={22} />
            <Typography>Loading chores…</Typography>
          </Stack>
        )}

        {rows?.length === 0 && <Alert severity="info">No chores assigned.</Alert>}

        {rows?.map((r) => (
          <Card key={r.choreId} variant="outlined">
            <CardContent>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
                  <Box>
                    <Typography variant="h6">{r.title}</Typography>
                    {r.description && (
                      <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                        {r.description}
                      </Typography>
                    )}
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center">
                      <Chip label={`${r.points} pts`} size="small" />
                      {statusChip(r.todayStatus)}
                    </Stack>
                  </Box>

                  <Button
                    variant="contained"
                    disabled={busy[r.choreId] || r.todayStatus === "PENDING" || r.todayStatus === "APPROVED"}
                    onClick={() => markDone(r)}
                  >
                    {busy[r.choreId] ? "Saving…" : r.todayStatus === "APPROVED" ? "Done" : r.todayStatus === "PENDING" ? "Pending" : "Mark done"}
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Container>
  );
}
