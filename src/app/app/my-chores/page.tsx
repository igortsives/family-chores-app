"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
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
  IconButton,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
  Chip,
} from "@mui/material";
import TokenRoundedIcon from "@mui/icons-material/TokenRounded";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import UndoRoundedIcon from "@mui/icons-material/UndoRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import HourglassTopRoundedIcon from "@mui/icons-material/HourglassTopRounded";
import EventBusyRoundedIcon from "@mui/icons-material/EventBusyRounded";
import CelebrationRoundedIcon from "@mui/icons-material/CelebrationRounded";
import { addDays, startOfWeekMonday } from "@/lib/week";
import {
  areAllChoresDone,
  kidMotivationMessage,
  resolveTimeOfDayMode,
  willAllChoresBeDoneAfterSubmit,
} from "./ui-helpers";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<Record<string, boolean>>({});
  const [leaderboardRows, setLeaderboardRows] = React.useState<LeaderboardRow[] | null>(null);
  const [leaderboardErr, setLeaderboardErr] = React.useState<string | null>(null);
  const [leaderboardOpen, setLeaderboardOpen] = React.useState(false);
  const [completionSplash, setCompletionSplash] = React.useState<{ title: string; points: number; allDone: boolean } | null>(null);
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
  const timePreview = searchParams.get("timeOfDay");
  const forcedMode = timePreview === "morning" || timePreview === "afternoon" || timePreview === "evening"
    ? timePreview
    : null;
  const activeDayMode = React.useMemo<"morning" | "afternoon" | "evening">(() => {
    return resolveTimeOfDayMode(forcedMode);
  }, [forcedMode]);
  const kidMotivation = React.useMemo(() => kidMotivationMessage(activeDayMode), [activeDayMode]);
  const splashTheme = React.useMemo(() => {
    if (activeDayMode === "morning") {
      return {
        paperBg: "linear-gradient(180deg, #f7fcff 0%, #eef7ff 100%)",
        border: "#b9dbff",
        iconBg: "rgba(33,150,243,0.15)",
        iconColor: "#1565c0",
        chipBg: "rgba(33,150,243,0.10)",
        chipBorder: "rgba(33,150,243,0.34)",
        chipText: "#0d47a1",
        buttonBg: "#1976d2",
        buttonHover: "#1565c0",
        burstA: "rgba(33,150,243,0.85)",
        burstB: "rgba(79,195,247,0.85)",
        burstC: "rgba(255,193,7,0.82)",
      };
    }
    if (activeDayMode === "afternoon") {
      return {
        paperBg: "linear-gradient(180deg, #fffaf1 0%, #fff4e2 100%)",
        border: "#f1d298",
        iconBg: "rgba(255,167,38,0.18)",
        iconColor: "#b35a00",
        chipBg: "rgba(255,167,38,0.13)",
        chipBorder: "rgba(255,167,38,0.38)",
        chipText: "#8a4b00",
        buttonBg: "#ef6c00",
        buttonHover: "#e65100",
        burstA: "rgba(255,167,38,0.85)",
        burstB: "rgba(255,204,128,0.86)",
        burstC: "rgba(255,112,67,0.82)",
      };
    }
    return {
      paperBg: "linear-gradient(180deg, #f5f3ff 0%, #eee9ff 100%)",
      border: "#cfc3ff",
      iconBg: "rgba(126,87,194,0.18)",
      iconColor: "#5e35b1",
      chipBg: "rgba(126,87,194,0.12)",
      chipBorder: "rgba(126,87,194,0.34)",
      chipText: "#4527a0",
      buttonBg: "#5e35b1",
      buttonHover: "#512da8",
      burstA: "rgba(126,87,194,0.85)",
      burstB: "rgba(149,117,205,0.86)",
      burstC: "rgba(179,157,219,0.82)",
    };
  }, [activeDayMode]);
  const splashFireworks = React.useMemo(
    () => [
      { left: "15%", top: "22%", delay: "0ms", colorKey: "burstA" as const },
      { left: "86%", top: "24%", delay: "120ms", colorKey: "burstB" as const },
      { left: "26%", top: "62%", delay: "220ms", colorKey: "burstC" as const },
      { left: "76%", top: "66%", delay: "320ms", colorKey: "burstA" as const },
      { left: "52%", top: "14%", delay: "420ms", colorKey: "burstB" as const },
    ],
    [],
  );
  const allChoresDone = React.useMemo(() => areAllChoresDone(rows, isKidView), [isKidView, rows]);
  const kidSubheading = allChoresDone
    ? "Awesome job! You finished all your chores."
    : kidMotivation;

  const load = React.useCallback(async () => {
    setErr(null);
    const dateQuery = `date=${encodeURIComponent(selectedDateKey)}`;
    const res = await fetch(`/api/my-chores?${dateQuery}`, { cache: "no-store" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j?.error || `Failed to load (${res.status})`);
    }
    const data = await res.json();
    const chores = Array.isArray(data?.chores) ? (data.chores as Row[]) : [];
    setRows(chores);
    return chores;
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
    if (status !== "authenticated") return;
    if (!isKidView) {
      router.replace("/app/admin/stats");
      return;
    }
    load().catch((e) => setErr(String(e?.message || e)));
  }, [status, isKidView, load, router]);

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

  if (status === "authenticated" && !isKidView) {
    return (
      <Stack direction="row" spacing={1.5} alignItems="center">
        <CircularProgress size={18} />
        <Typography>Redirecting…</Typography>
      </Stack>
    );
  }

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

      if (isKidView) {
        const allDoneAfterSubmit = willAllChoresBeDoneAfterSubmit(rows, r.choreId);
        setCompletionSplash({ title: r.title, points: r.points, allDone: allDoneAfterSubmit });
      }
      void load().catch((e) => setErr(String(e?.message || e)));
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
      <Container maxWidth="md" sx={{ pt: 0 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress size={22} />
          <Typography>Loading session…</Typography>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ pt: 0 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h4">{isKidView ? "Chores" : "My chores"}</Typography>
          <Typography color="text.secondary">
            {isKidView
              ? kidSubheading
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
          const kidActionIcon = busy[r.choreId]
            ? <CircularProgress size={20} color="inherit" />
            : canUndo
              ? <UndoRoundedIcon />
              : r.todayStatus === "APPROVED"
                ? <CheckCircleRoundedIcon />
                : isRejected
                  ? <ReplayRoundedIcon />
                  : !canSubmitForDay
                    ? <EventBusyRoundedIcon />
                    : r.todayStatus === "PENDING"
                      ? <HourglassTopRoundedIcon />
                      : <TaskAltRoundedIcon />;
          const kidActionPalette = canUndo
            ? { color: "warning.dark", bgcolor: "rgba(237,108,2,0.12)", borderColor: "rgba(237,108,2,0.45)" }
            : r.todayStatus === "APPROVED"
              ? { color: "success.main", bgcolor: "rgba(46,125,50,0.14)", borderColor: "rgba(46,125,50,0.40)" }
              : isRejected
                ? { color: "#8a4b00", bgcolor: "rgba(237,108,2,0.16)", borderColor: "rgba(237,108,2,0.52)" }
                : !canSubmitForDay
                  ? { color: "text.disabled", bgcolor: "rgba(0,0,0,0.04)", borderColor: "rgba(0,0,0,0.20)" }
                  : r.todayStatus === "PENDING"
                    ? { color: "warning.dark", bgcolor: "rgba(237,108,2,0.10)", borderColor: "rgba(237,108,2,0.38)" }
                    : { color: "common.white", bgcolor: "primary.main", borderColor: "primary.main" };

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

                    {isKidView ? (
                      <Tooltip title={label} placement="left">
                        <Box component="span">
                          <IconButton
                            data-testid={`chore-action-${r.choreId}`}
                            aria-label={label}
                            disabled={disabled}
                            onClick={() => (canUndo ? undoDone(r) : markDone(r))}
                            sx={{
                              width: 56,
                              height: 56,
                              borderRadius: "50%",
                              border: "2px solid",
                              color: kidActionPalette.color,
                              bgcolor: kidActionPalette.bgcolor,
                              borderColor: kidActionPalette.borderColor,
                              transition: "transform 120ms ease, background-color 120ms ease, box-shadow 120ms ease",
                              "&:hover": disabled
                                ? undefined
                                : {
                                    transform: "translateY(-1px)",
                                    boxShadow: "0 6px 14px rgba(15,23,42,0.14)",
                                    bgcolor: canUndo
                                      ? "rgba(237,108,2,0.18)"
                                      : isRejected
                                        ? "rgba(237,108,2,0.22)"
                                        : "primary.dark",
                                    color: canUndo || isRejected ? kidActionPalette.color : "common.white",
                                  },
                              "&.Mui-disabled": {
                                opacity: 1,
                                color: kidActionPalette.color,
                                bgcolor: kidActionPalette.bgcolor,
                                borderColor: kidActionPalette.borderColor,
                              },
                            }}
                          >
                            {kidActionIcon}
                          </IconButton>
                        </Box>
                      </Tooltip>
                    ) : (
                      <Button
                        data-testid={`chore-action-${r.choreId}`}
                        variant={canUndo ? "outlined" : "contained"}
                        color={canUndo ? "inherit" : isRejected ? "warning" : "primary"}
                        disabled={disabled}
                        onClick={() => (canUndo ? undoDone(r) : markDone(r))}
                      >
                        {label}
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      <Dialog
        open={isKidView && Boolean(completionSplash)}
        onClose={() => setCompletionSplash(null)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: 3,
            border: "1px solid",
            borderColor: splashTheme.border,
            backgroundImage: splashTheme.paperBg,
            boxShadow: "0 16px 34px rgba(15,23,42,0.20)",
          },
        }}
      >
        <DialogContent
          sx={{
            pt: 2.5,
            pb: 1.5,
            position: "relative",
            overflow: "hidden",
            "@keyframes splashBurst": {
              "0%": { transform: "translate(-50%, -50%) scale(0.12)", opacity: 0 },
              "18%": { opacity: 0.95 },
              "70%": { transform: "translate(-50%, -50%) scale(1)", opacity: 0.42 },
              "100%": { transform: "translate(-50%, -50%) scale(1.28)", opacity: 0 },
            },
          }}
        >
          <Box sx={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            {splashFireworks.map((fx, idx) => {
              const burstColor = splashTheme[fx.colorKey];
              return (
                <Box
                  key={`splash-firework-${idx}`}
                  sx={{
                    position: "absolute",
                    left: fx.left,
                    top: fx.top,
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor: burstColor,
                    opacity: 0,
                    transform: "translate(-50%, -50%) scale(0.12)",
                    boxShadow: `
                      0 -18px 0 0 ${burstColor},
                      13px -13px 0 0 ${burstColor},
                      18px 0 0 0 ${burstColor},
                      13px 13px 0 0 ${burstColor},
                      0 18px 0 0 ${burstColor},
                      -13px 13px 0 0 ${burstColor},
                      -18px 0 0 0 ${burstColor},
                      -13px -13px 0 0 ${burstColor}
                    `,
                    animation: `splashBurst 900ms ease-out ${fx.delay} 1 forwards`,
                  }}
                />
              );
            })}
          </Box>
          <Stack alignItems="center" spacing={1.25} textAlign="center" sx={{ position: "relative", zIndex: 1 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                bgcolor: splashTheme.iconBg,
                color: splashTheme.iconColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CelebrationRoundedIcon sx={{ fontSize: 34 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              {completionSplash?.allDone ? "All chores finished for today!" : "Awesome job!"}
            </Typography>
            <Typography color="text.secondary">
              {completionSplash?.allDone
                ? (
                  <>
                    You finished <b>{completionSplash?.title}</b> and completed all your chores for today.
                  </>
                )
                : (
                  <>
                    You finished <b>{completionSplash?.title}</b>.
                  </>
                )}
            </Typography>
            <Chip
              icon={<TokenRoundedIcon />}
              variant="outlined"
              label={`+${completionSplash?.points ?? 0} coins (after parent approval)`}
              sx={{
                bgcolor: splashTheme.chipBg,
                borderColor: splashTheme.chipBorder,
                color: splashTheme.chipText,
                "& .MuiChip-icon": { color: splashTheme.chipText },
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, justifyContent: "center" }}>
          <Button
            onClick={() => setCompletionSplash(null)}
            variant="contained"
            size="small"
            sx={{
              bgcolor: splashTheme.buttonBg,
              px: 2,
              minWidth: 0,
              "&:hover": { bgcolor: splashTheme.buttonHover },
            }}
          >
            {completionSplash?.allDone ? "Done for today" : "Keep going"}
          </Button>
        </DialogActions>
      </Dialog>

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
