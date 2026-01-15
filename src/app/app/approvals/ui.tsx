"use client";

import * as React from "react";
import { Stack, Typography, Card, CardContent, Button, Alert, Chip } from "@mui/material";

type Pending = {
  id: string;
  completedAt: string;
  pointsEarned: number;
  user: { name?: string | null; email: string };
  choreInstance: { chore: { title: string } };
};

export default function ApprovalsClient() {
  const [pending, setPending] = React.useState<Pending[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setErr(null);
    const res = await fetch("/api/approvals/pending");
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Failed to load approvals");
      return;
    }
    const j = await res.json();
    setPending(j.pending || []);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const approve = async (id: string) => {
    setErr(null);
    const res = await fetch(`/api/approvals/${id}/approve`, { method: "POST" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Approve failed");
      return;
    }
    await load();
  };

  const reject = async (id: string) => {
    setErr(null);
    const res = await fetch(`/api/approvals/${id}/reject`, { method: "POST" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Reject failed");
      return;
    }
    await load();
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Approvals</Typography>
      <Typography color="text.secondary">Approve or reject submitted chores. Points & awards count only after approval.</Typography>
      {err && <Alert severity="error">{err}</Alert>}

      {pending.length === 0 ? (
        <Typography color="text.secondary">No pending submissions 🎉</Typography>
      ) : (
        pending.map(p => (
          <Card key={p.id}>
            <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
              <div>
                <Typography variant="h6">{p.choreInstance.chore.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Submitted by {p.user.name ?? p.user.email} • {new Date(p.completedAt).toLocaleString()}
                </Typography>
              </div>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label={`${p.pointsEarned} pts`} />
                <Button variant="contained" onClick={() => approve(p.id)}>Approve</Button>
                <Button color="error" onClick={() => reject(p.id)}>Reject</Button>
              </Stack>
            </CardContent>
          </Card>
        ))
      )}
    </Stack>
  );
}
