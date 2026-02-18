"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";

type ExchangeRow = {
  id: string;
  stars: number;
  note: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt: string;
  reviewedAt: string | null;
  user: { id: string; name: string | null; username: string | null; role: "ADULT" | "KID" };
  reviewedBy: { id: string; name: string | null; username: string | null } | null;
};

export default function StarExchangesPage() {
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: "ADULT" | "KID" } | undefined)?.role;

  const [rows, setRows] = React.useState<ExchangeRow[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<Record<string, boolean>>({});

  async function load() {
    setErr(null);
    const res = await fetch("/api/admin/stars/exchanges", { cache: "no-store" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j?.error || `Failed (${res.status})`);
    setRows(j.exchanges ?? []);
  }

  React.useEffect(() => {
    if (status === "authenticated" && role === "ADULT") load().catch((e) => setErr(String(e?.message || e)));
  }, [status, role]);

  async function act(id: string, action: "APPROVE" | "REJECT") {
    setBusy((b) => ({ ...b, [id]: true }));
    setErr(null);
    try {
      const res = await fetch("/api/admin/stars/exchanges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || `Failed (${res.status})`);
      await load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setErr(message);
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  }

  const statusChip = (s: ExchangeRow["status"]) => {
    if (s === "APPROVED") return <Chip label="Approved" size="small" color="success" />;
    if (s === "REJECTED") return <Chip label="Rejected" size="small" color="error" />;
    return <Chip label="Pending" size="small" color="warning" />;
  };

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
        <Typography variant="h4">Star exchanges</Typography>
        <Typography color="text.secondary">Approve or reject kids&apos; star redemption requests.</Typography>
      </Box>

      {err && <Alert severity="error">{err}</Alert>}

      {!rows && (
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress size={22} />
          <Typography>Loading exchange requests…</Typography>
        </Stack>
      )}

      {rows?.length === 0 && <Alert severity="info">No exchange requests yet.</Alert>}

      {rows?.map((r) => {
        const pending = r.status === "PENDING";
        return (
          <Card key={r.id} variant="outlined">
            <CardContent>
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
                  <Box>
                    <Typography variant="h6">
                      {r.stars} ⭐ - {r.note || "Exchange request"}
                    </Typography>
                    <Typography color="text.secondary">
                      Kid: <b>{r.user.name || r.user.username || r.user.id}</b>
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      Requested: {new Date(r.requestedAt).toLocaleString()}
                    </Typography>
                    {r.reviewedAt && (
                      <Typography color="text.secondary" variant="body2">
                        Reviewed: {new Date(r.reviewedAt).toLocaleString()}
                        {r.reviewedBy ? ` by ${r.reviewedBy.name || r.reviewedBy.username || r.reviewedBy.id}` : ""}
                      </Typography>
                    )}
                  </Box>

                  <Stack direction="row" spacing={1} alignItems="center">
                    {statusChip(r.status)}
                    <Button
                      variant="contained"
                      disabled={!pending || busy[r.id]}
                      onClick={() => act(r.id, "APPROVE")}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      disabled={!pending || busy[r.id]}
                      onClick={() => act(r.id, "REJECT")}
                    >
                      Reject
                    </Button>
                  </Stack>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}
