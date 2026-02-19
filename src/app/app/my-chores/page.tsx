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
  todayCompletionId: string | null;
  todayStatus: "NOT_DONE" | "PENDING" | "APPROVED" | "REJECTED" | string;
  todayRejectionReason: string | null;
};

export default function MyChoresPage() {
  const { data: session, status } = useSession();
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<Record<string, boolean>>({});
  const isKidView = (session?.user as any)?.role === "KID";

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

  async function undoDone(r: Row) {
    if (!r.todayCompletionId) return;
    setBusy((b) => ({ ...b, [r.choreId]: true }));
    setErr(null);
    try {
      const res = await fetch("/api/chores/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completionId: r.todayCompletionId }),
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
    if (s === "PENDING") return <Chip label={isKidView ? "Waiting for parent" : "Pending approval"} color="warning" size="small" />;
    if (s === "REJECTED") return <Chip label={isKidView ? "Try again" : "Rejected"} color="error" size="small" />;
    if (s === "NOT_DONE") return <Chip label={isKidView ? "To do" : "Not done"} size="small" />;
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
          <Typography variant="h4">{isKidView ? "Today's chores" : "My chores"}</Typography>
          <Typography color="text.secondary">
            {isKidView
              ? "Tap when you finish a chore. A parent will check it."
              : "Mark chores done. If you're a kid, a parent must approve."}
          </Typography>
        </Box>

        {err && <Alert severity="error">{err}</Alert>}

        {!rows && !err && (
          <Stack direction="row" spacing={2} alignItems="center">
            <CircularProgress size={22} />
            <Typography>{isKidView ? "Getting your chores..." : "Loading chores..."}</Typography>
          </Stack>
        )}

        {rows?.length === 0 && <Alert severity="info">{isKidView ? "No chores for now. Nice job!" : "No chores assigned."}</Alert>}

        {rows?.map((r) => {
          const isRejected = r.todayStatus === "REJECTED";
          const canUndo = isKidView && r.todayStatus === "PENDING" && Boolean(r.todayCompletionId);
          const disabled = busy[r.choreId] || r.todayStatus === "APPROVED" || (r.todayStatus === "PENDING" && !canUndo);
          const label = busy[r.choreId]
            ? canUndo
              ? isKidView
                ? "Changing back..."
                : "Undoing..."
              : isRejected
                ? isKidView
                  ? "Trying again..."
                  : "Resubmitting..."
                : "Saving..."
            : canUndo
              ? isKidView
                ? "Not finished yet"
                : "Undo"
              : r.todayStatus === "APPROVED"
                ? "Done"
                : isRejected
                  ? isKidView
                    ? "Try again"
                    : "Resubmit"
                  : isKidView
                    ? "I finished this"
                    : "Mark done";

          return (
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
                      {r.todayStatus === "REJECTED" && r.todayRejectionReason && (
                        <Alert severity="error" sx={{ mt: 1.5, py: 0 }}>
                          {isKidView ? "Parent note: " : "Parent feedback: "}
                          {r.todayRejectionReason}{" "}
                          {isKidView ? (
                            <>
                              Fix it, then tap <b>Try again</b>.
                            </>
                          ) : (
                            <>
                              Update and tap <b>Resubmit</b>.
                            </>
                          )}
                        </Alert>
                      )}
                    </Box>

                    <Button
                      variant={canUndo ? "outlined" : "contained"}
                      color={canUndo ? "inherit" : isRejected ? "warning" : "primary"}
                      disabled={disabled}
                      onClick={() => (canUndo ? undoDone(r) : markDone(r))}
                    >
                      {label}
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    </Container>
  );
}
