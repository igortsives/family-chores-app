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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  Typography,
  Chip,
} from "@mui/material";
import TokenRoundedIcon from "@mui/icons-material/TokenRounded";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import { addDays, startOfWeekMonday } from "@/lib/week";

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

type LeaderboardRow = {
  kid: { id: string; name: string | null; email: string };
  score: number;
  scorePct: number;
  completionRate: number;
  consistencyRate: number;
  expectedDue: number;
  approvedCount: number;
  possibleActiveDays: number;
  activeDays: number;
  weeklyPoints: number;
  points: number;
  streak: number;
};

function toDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function MyChoresPage() {
  const { data: session, status } = useSession();
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<Record<string, boolean>>({});
  const [leaderboardRows, setLeaderboardRows] = React.useState<LeaderboardRow[] | null>(null);
  const [leaderboardErr, setLeaderboardErr] = React.useState<string | null>(null);
  const [leaderboardOpen, setLeaderboardOpen] = React.useState(false);
  const isKidView = (session?.user as any)?.role === "KID";
  const kidUserId = (session?.user as any)?.id as string | undefined;
  const kidUserEmail = session?.user?.email ?? null;
  const [selectedDate, setSelectedDate] = React.useState(() => {
    const x = new Date();
    x.setHours(0, 0, 0, 0);
    return x;
  });

  const todayDateKey = toDateKey(new Date());
  const selectedDateKey = toDateKey(selectedDate);
  const isSelectedToday = selectedDateKey === todayDateKey;
  const weekDays = React.useMemo(() => {
    const start = startOfWeekMonday(new Date());
    return Array.from({ length: 7 }, (_, idx) => addDays(start, idx));
  }, []);
  const dayNameFmt = React.useMemo(
    () => new Intl.DateTimeFormat(undefined, { weekday: "short" }),
    [],
  );

  const load = React.useCallback(async () => {
    setErr(null);
    const dateQuery = `date=${encodeURIComponent(selectedDateKey)}`;
    const res = await fetch(`/api/my-chores?${dateQuery}`, { cache: "no-store" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j?.error || `Failed to load (${res.status})`);
    }
    const data = await res.json();
    setRows(data.chores);
  }, [selectedDateKey]);

  const loadLeaderboard = React.useCallback(async () => {
    if (!isKidView) return;
    setLeaderboardErr(null);
    const res = await fetch("/api/leaderboard", { cache: "no-store" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j?.error || `Failed (${res.status})`);
    setLeaderboardRows(Array.isArray(j.rows) ? j.rows : []);
  }, [isKidView]);

  React.useEffect(() => {
    if (status === "authenticated") load().catch((e) => setErr(String(e?.message || e)));
  }, [status, load]);

  React.useEffect(() => {
    if (status === "authenticated" && isKidView) {
      loadLeaderboard().catch((e) => setLeaderboardErr(String(e?.message || e)));
      return;
    }
    if (!isKidView) {
      setLeaderboardRows(null);
      setLeaderboardErr(null);
    }
  }, [status, isKidView, loadLeaderboard]);

  const myLeaderboard = React.useMemo(() => {
    if (!isKidView || !leaderboardRows?.length) return null;

    const index = leaderboardRows.findIndex((r) => {
      if (kidUserId && r.kid.id === kidUserId) return true;
      if (kidUserEmail && r.kid.email.toLowerCase() === kidUserEmail.toLowerCase()) return true;
      return false;
    });
    if (index < 0) return null;

    const me = leaderboardRows[index];
    const ahead = index > 0 ? leaderboardRows[index - 1] : null;
    const nextRankProgress = me.scorePct;

    return {
      rank: index + 1,
      total: leaderboardRows.length,
      nextRankProgress,
      aheadName: ahead ? ahead.kid.name || ahead.kid.email : null,
    };
  }, [isKidView, leaderboardRows, kidUserId, kidUserEmail]);

  const openLeaderboard = React.useCallback(() => {
    setLeaderboardOpen(true);
    if (!leaderboardRows) {
      loadLeaderboard().catch((e) => setLeaderboardErr(String(e?.message || e)));
    }
  }, [leaderboardRows, loadLeaderboard]);

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

        {isKidView && (
          <Card
            variant="outlined"
            sx={{
              borderColor: "#b8d7ff",
              backgroundImage: "linear-gradient(180deg, #fafdff 0%, #eef6ff 100%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
            }}
          >
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Box sx={{ display: "flex", justifyContent: "center", overflowX: "auto", pb: 0.5 }}>
                <Box sx={{ display: "flex", gap: 1.25, width: "max-content", mx: "auto", px: 0.5 }}>
                  {weekDays.map((day) => {
                    const dayKey = toDateKey(day);
                    const isSelected = dayKey === selectedDateKey;
                    const isToday = dayKey === todayDateKey;
                    const isFuture = dayKey > todayDateKey;
                    return (
                      <Stack key={dayKey} spacing={0.5} alignItems="center">
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 800,
                            lineHeight: 1,
                            color: isSelected ? "#a05a00" : isToday ? "#0b6aa2" : "text.secondary",
                          }}
                        >
                            {dayNameFmt.format(day)}
                        </Typography>
                        <Button
                          variant="outlined"
                          color="inherit"
                          disabled={isFuture}
                          onClick={() => {
                            if (isFuture) return;
                            setSelectedDate(day);
                          }}
                          sx={{
                            minWidth: 50,
                            width: 50,
                            height: 50,
                            borderRadius: "999px",
                            flexShrink: 0,
                            p: 0,
                            fontWeight: 800,
                            fontSize: "1rem",
                            lineHeight: 1,
                            textTransform: "none",
                            borderWidth: 2,
                            borderStyle: "solid",
                            bgcolor: isSelected ? "#ffe08a" : isToday ? "#e8f7ff" : isFuture ? "#f7f7f8" : "#eef5ff",
                            borderColor: isSelected ? "#f4b400" : isToday ? "#4db2ff" : isFuture ? "#e2e4e8" : "#c8daf7",
                            color: isSelected ? "#4a3000" : isToday ? "#0d4870" : "text.primary",
                            boxShadow: isSelected
                              ? "0 4px 10px rgba(244,180,0,0.25)"
                              : isToday
                                ? "0 0 0 3px rgba(77,178,255,0.18)"
                                : "none",
                            "&:hover": isFuture
                              ? undefined
                              : {
                                  borderColor: isSelected ? "#d8a200" : isToday ? "#2398e4" : "#98b9ef",
                                  bgcolor: isSelected ? "#ffd76a" : isToday ? "#d8f0ff" : "#e2eeff",
                                  transform: "translateY(-1px)",
                                },
                            "&.Mui-disabled": {
                              opacity: 0.78,
                              color: "text.disabled",
                            },
                          }}
                        >
                          {day.getDate()}
                        </Button>
                      </Stack>
                    );
                  })}
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}

        {isKidView && (
          <Card
            variant="outlined"
            sx={{
              borderColor: "#f4d28a",
              backgroundColor: "#fff9ec",
            }}
          >
            <CardContent sx={{ py: 1.1, "&:last-child": { pb: 1.1 } }}>
              <Stack spacing={0.8}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    {myLeaderboard
                      ? `You are #${myLeaderboard.rank} of ${myLeaderboard.total}`
                      : "Track your leaderboard place"}
                  </Typography>
                  <Button
                    variant="text"
                    color="inherit"
                    size="small"
                    onClick={openLeaderboard}
                    startIcon={<EmojiEventsOutlinedIcon sx={{ fontSize: 16 }} />}
                    sx={{
                      whiteSpace: "nowrap",
                      minWidth: 0,
                      px: 0.75,
                      py: 0.35,
                      borderRadius: "999px",
                      fontWeight: 700,
                      color: "#7a5a1a",
                      "&:hover": { backgroundColor: "rgba(244,180,0,0.12)" },
                    }}
                  >
                    Leaderboard
                  </Button>
                </Stack>

                <Typography variant="body2" color="text.secondary">
                  {myLeaderboard
                    ? myLeaderboard.rank === 1
                      ? "Awesome! You are in first place."
                      : `Keep going - you're chasing ${myLeaderboard.aheadName}.`
                    : "Scores update after a parent approves chores."}
                </Typography>

                <LinearProgress
                  variant="determinate"
                  value={myLeaderboard?.nextRankProgress ?? 0}
                  sx={{
                    height: 7,
                    borderRadius: "999px",
                    bgcolor: "rgba(0,0,0,0.08)",
                    "& .MuiLinearProgress-bar": {
                      borderRadius: "999px",
                      backgroundImage: "linear-gradient(90deg, #ffa83e 0%, #ffcf69 100%)",
                    },
                  }}
                />
              </Stack>
              {leaderboardErr && (
                <Alert severity="error" sx={{ mt: 0.8 }}>
                  {leaderboardErr}
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

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
          const canSubmitForDay = !isKidView || isSelectedToday;
          const disabled = busy[r.choreId]
            || r.todayStatus === "APPROVED"
            || (r.todayStatus === "PENDING" && !canUndo)
            || (!canUndo && !canSubmitForDay);
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
                  : isKidView && !canSubmitForDay
                    ? "Today only"
                  : isKidView
                    ? "I finished this"
                    : "Mark done";

          return (
            <Card key={r.choreId} variant="outlined" data-testid={`chore-card-${r.choreId}`}>
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
                        <Chip
                          icon={<TokenRoundedIcon />}
                          label={String(r.points)}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
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
                      data-testid={`chore-action-${r.choreId}`}
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

      <Dialog open={isKidView && leaderboardOpen} onClose={() => setLeaderboardOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Leaderboard</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1}>
            {leaderboardErr && <Alert severity="error">{leaderboardErr}</Alert>}

            {!leaderboardRows && !leaderboardErr && (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <CircularProgress size={20} />
                <Typography>Loading leaderboard...</Typography>
              </Stack>
            )}

            {leaderboardRows?.length === 0 && <Alert severity="info">No kids to show yet.</Alert>}

            {leaderboardRows?.map((r, idx) => {
              const isMe = (kidUserId && r.kid.id === kidUserId)
                || (kidUserEmail && r.kid.email.toLowerCase() === kidUserEmail.toLowerCase());
              return (
                <Stack
                  key={r.kid.id}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{
                    px: 1.25,
                    py: 0.9,
                    borderRadius: 2,
                    backgroundColor: isMe ? "#fff3d9" : "#f7f9fc",
                    border: "1px solid",
                    borderColor: isMe ? "#f4d28a" : "#e6eaf2",
                  }}
                >
                  <Typography sx={{ fontWeight: isMe ? 800 : 700 }}>
                    #{idx + 1} {r.kid.name || r.kid.email} {isMe ? "(You)" : ""}
                  </Typography>
                  <Chip size="small" label={`Score ${r.scorePct}`} color="warning" variant="outlined" />
                </Stack>
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLeaderboardOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
