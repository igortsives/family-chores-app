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
  Stack,
  Typography,
  Chip,
} from "@mui/material";

type PendingRow = {
  id: string;
  completedAt: string;
  pointsEarned: number;
  kid: { id: string; name: string | null; email: string };
  chore: { id: string; title: string; points: number };
  dueDate: string;
};

export default function ApprovalsPage() {
  const { data: session, status } = useSession();
  const role = (session?.user as any)?.role as "ADULT" | "KID" | undefined;

  const [rows, setRows] = React.useState<PendingRow[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<Record<string, boolean>>({});

  async function load() {
    setErr(null);
    const res = await fetch("/api/admin/approvals", { cache: "no-store" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j?.error || `Failed (${res.status})`);
    setRows(j.pending);
  }

  React.useEffect(() => {
    if (status === "authenticated" && role === "ADULT") load().catch((e) => setErr(String(e?.message || e)));
  }, [status, role]);

  async function act(id: string, action: "APPROVE" | "REJECT") {
    setBusy((b) => ({ ...b, [id]: true }));
    setErr(null);
    try {
      const res = await fetch("/api/admin/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completionId: id, action }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || `Failed (${res.status})`);
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  }

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
        <Typography variant="h4">Approvals</Typography>
        <Typography color="text.secondary">Approve or reject kids’ completed chores.</Typography>
      </Box>

      {err && <Alert severity="error">{err}</Alert>}

      {!rows && (
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress size={22} />
          <Typography>Loading pending approvals…</Typography>
        </Stack>
      )}

      {rows?.length === 0 && <Alert severity="success">No pending chores 🎉</Alert>}

      {rows?.map((r) => (
        <Card key={r.id} variant="outlined">
          <CardContent>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" gap={2} alignItems="flex-start">
                <Box>
                  <Typography variant="h6">{r.chore.title}</Typography>
                  <Typography color="text.secondary">
                    Kid: <b>{r.kid.name || r.kid.email}</b>
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center">
                    <Chip label={`${r.pointsEarned} pts`} size="small" />
                    <Chip label="Pending" size="small" color="warning" />
                  </Stack>
                </Box>

                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    disabled={busy[r.id]}
                    onClick={() => act(r.id, "APPROVE")}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    disabled={busy[r.id]}
                    onClick={() => act(r.id, "REJECT")}
                  >
                    Reject
                  </Button>
                </Stack>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
