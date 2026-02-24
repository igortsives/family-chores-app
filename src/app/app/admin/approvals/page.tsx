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
  IconButton,
  FormControl,
  Dialog,
  DialogContent,
  DialogTitle,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Popover,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import UnfoldMoreRoundedIcon from "@mui/icons-material/UnfoldMoreRounded";
import UnfoldLessRoundedIcon from "@mui/icons-material/UnfoldLessRounded";

type ApprovalRow = {
  id: string;
  status: "PENDING" | "REJECTED";
  completedAt: string;
  pointsEarned: number;
  parentComment: string | null;
  rejectionDate: string | null;
  kid: { id: string; name: string | null; email: string };
  chore: { id: string; title: string; points: number };
  dueDate: string;
};

type ActivityRow = {
  id: string;
  status: "PENDING" | "REJECTED" | "APPROVED" | "DUE";
  completedAt: string | null;
  approvedAt: string | null;
  pointsEarned: number;
  parentComment: string | null;
  rejectionDate: string | null;
  kid: { id: string; name: string | null; email: string };
  chore: { id: string; title: string; points: number };
  dueDate: string;
};

type ViewMode = "today" | "past";
type SortDirection = "asc" | "desc";
type LifecycleSortKey = "chore" | "kid" | "status" | "dueDate" | "completedAt" | "rejectionDate" | "approvedAt";

export default function ApprovalsPage() {
  const { data: session, status } = useSession();
  const role = (session?.user as any)?.role as "ADULT" | "KID" | undefined;

  const [pendingRows, setPendingRows] = React.useState<ApprovalRow[] | null>(null);
  const [rejectedRows, setRejectedRows] = React.useState<ApprovalRow[] | null>(null);
  const [activityRows, setActivityRows] = React.useState<ActivityRow[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<Record<string, boolean>>({});
  const [comments, setComments] = React.useState<Record<string, string>>({});
  const [view, setView] = React.useState<ViewMode>("today");

  const [logStatusFilter, setLogStatusFilter] = React.useState<"ALL" | "PENDING" | "REJECTED" | "APPROVED" | "DUE">("ALL");
  const [logKidFilter, setLogKidFilter] = React.useState<string>("ALL");
  const [logChoreFilter, setLogChoreFilter] = React.useState<string>("ALL");
  const [logSortBy, setLogSortBy] = React.useState<LifecycleSortKey>("completedAt");
  const [logSortDirection, setLogSortDirection] = React.useState<SortDirection>("desc");
  const [logPage, setLogPage] = React.useState(0);
  const [logRowsPerPage, setLogRowsPerPage] = React.useState(15);
  const [filterAnchorEl, setFilterAnchorEl] = React.useState<HTMLElement | null>(null);
  const [expandedLogRows, setExpandedLogRows] = React.useState<Record<string, boolean>>({});
  const [logCommentDrafts, setLogCommentDrafts] = React.useState<Record<string, string>>({});
  const [logCommentBusy, setLogCommentBusy] = React.useState<Record<string, boolean>>({});
  const [logCommentEditMode, setLogCommentEditMode] = React.useState<Record<string, boolean>>({});
  const [hoveredLogRowId, setHoveredLogRowId] = React.useState<string | null>(null);
  const [applyInitialTodayDuePriority, setApplyInitialTodayDuePriority] = React.useState(true);
  const [logModalOpen, setLogModalOpen] = React.useState(false);

  const startOfToday = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const startOfTomorrow = React.useMemo(() => {
    const d = new Date(startOfToday);
    d.setDate(d.getDate() + 1);
    return d;
  }, [startOfToday]);

  const isPast = React.useCallback(
    (row: { dueDate: string }) => new Date(row.dueDate).getTime() < startOfToday.getTime(),
    [startOfToday],
  );

  const isToday = React.useCallback(
    (row: { dueDate: string }) => {
      const due = new Date(row.dueDate).getTime();
      return due >= startOfToday.getTime() && due < startOfTomorrow.getTime();
    },
    [startOfToday, startOfTomorrow],
  );

  const todayPending = React.useMemo(() => (pendingRows ?? []).filter((r) => isToday(r)), [pendingRows, isToday]);
  const pastPending = React.useMemo(() => (pendingRows ?? []).filter((r) => isPast(r)), [pendingRows, isPast]);
  const todayRejected = React.useMemo(() => (rejectedRows ?? []).filter((r) => isToday(r)), [rejectedRows, isToday]);
  const pastRejected = React.useMemo(() => (rejectedRows ?? []).filter((r) => isPast(r)), [rejectedRows, isPast]);
  const visiblePending = view === "today" ? todayPending : pastPending;
  const visibleRejected = view === "today" ? todayRejected : pastRejected;
  const visibleActivity = React.useMemo(
    () => (activityRows ?? []).filter((row) => (view === "past" ? isPast(row) : isToday(row))),
    [activityRows, isPast, isToday, view],
  );
  const lifecycleKidOptions = React.useMemo(() => {
    const byId = new Map<string, string>();
    for (const row of visibleActivity) {
      byId.set(row.kid.id, row.kid.name || row.kid.email);
    }
    return Array.from(byId.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  }, [visibleActivity]);
  const lifecycleChoreOptions = React.useMemo(() => {
    const byId = new Map<string, string>();
    for (const row of visibleActivity) {
      byId.set(row.chore.id, row.chore.title);
    }
    return Array.from(byId.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  }, [visibleActivity]);
  const lifecycleKidLabelById = React.useMemo(
    () => new Map(lifecycleKidOptions.map((x) => [x.id, x.label])),
    [lifecycleKidOptions],
  );
  const lifecycleChoreLabelById = React.useMemo(
    () => new Map(lifecycleChoreOptions.map((x) => [x.id, x.label])),
    [lifecycleChoreOptions],
  );

  const todayCount = todayPending.length + todayRejected.length;
  const pastCount = pastPending.length + pastRejected.length;
  const hasLoaded = !!pendingRows && !!rejectedRows && !!activityRows;
  const hasActiveLogFilters =
    logStatusFilter !== "ALL" || logKidFilter !== "ALL" || logChoreFilter !== "ALL";
  const filterPopoverOpen = Boolean(filterAnchorEl);

  const lifecycleFilteredRows = React.useMemo(() => {
    const rows = visibleActivity.filter((row) => {
      const statusMatch = logStatusFilter === "ALL" || row.status === logStatusFilter;
      const kidMatch = logKidFilter === "ALL" || row.kid.id === logKidFilter;
      const choreMatch = logChoreFilter === "ALL" || row.chore.id === logChoreFilter;
      if (!statusMatch) return false;
      if (!kidMatch) return false;
      if (!choreMatch) return false;
      return true;
    });

    const compareDate = (a: string | null, b: string | null) => {
      const av = a ? new Date(a).getTime() : 0;
      const bv = b ? new Date(b).getTime() : 0;
      return av - bv;
    };

    rows.sort((a, b) => {
      if (applyInitialTodayDuePriority && view === "today" && logSortBy === "completedAt" && logSortDirection === "desc") {
        const aDue = a.status === "DUE" ? 1 : 0;
        const bDue = b.status === "DUE" ? 1 : 0;
        if (aDue !== bDue) return bDue - aDue;
      }

      let cmp = 0;
      if (logSortBy === "chore") cmp = a.chore.title.localeCompare(b.chore.title);
      if (logSortBy === "kid") cmp = (a.kid.name ?? a.kid.email).localeCompare(b.kid.name ?? b.kid.email);
      if (logSortBy === "status") {
        const statusRank: Record<ActivityRow["status"], number> = {
          DUE: 0,
          PENDING: 1,
          REJECTED: 2,
          APPROVED: 3,
        };
        cmp = statusRank[a.status] - statusRank[b.status];
      }
      if (logSortBy === "dueDate") cmp = compareDate(a.dueDate, b.dueDate);
      if (logSortBy === "completedAt") cmp = compareDate(a.completedAt, b.completedAt);
      if (logSortBy === "rejectionDate") cmp = compareDate(a.rejectionDate, b.rejectionDate);
      if (logSortBy === "approvedAt") cmp = compareDate(a.approvedAt, b.approvedAt);
      return logSortDirection === "asc" ? cmp : -cmp;
    });

    return rows;
  }, [
    applyInitialTodayDuePriority,
    view,
    logSortBy,
    logSortDirection,
    logStatusFilter,
    logKidFilter,
    logChoreFilter,
    visibleActivity,
  ]);

  const lifecyclePageRows = React.useMemo(() => {
    const start = logPage * logRowsPerPage;
    return lifecycleFilteredRows.slice(start, start + logRowsPerPage);
  }, [lifecycleFilteredRows, logPage, logRowsPerPage]);
  const expandableLifecycleRows = React.useMemo(
    () => lifecycleFilteredRows.filter((row) => row.status !== "DUE"),
    [lifecycleFilteredRows],
  );
  const allLifecycleRowsExpanded = React.useMemo(
    () =>
      expandableLifecycleRows.length > 0 &&
      expandableLifecycleRows.every((row) => !!expandedLogRows[row.id]),
    [expandableLifecycleRows, expandedLogRows],
  );

  function setLogSort(next: LifecycleSortKey) {
    setApplyInitialTodayDuePriority(false);
    if (logSortBy === next) {
      setLogSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setLogSortBy(next);
    setLogSortDirection("asc");
  }

  function toggleLogRow(row: ActivityRow) {
    setExpandedLogRows((prev) => {
      const willExpand = !prev[row.id];
      if (willExpand) {
        setLogCommentDrafts((drafts) => ({
          ...drafts,
          [row.id]: drafts[row.id] ?? row.parentComment ?? "",
        }));
        setLogCommentEditMode((modes) => ({
          ...modes,
          [row.id]: false,
        }));
      }
      return { ...prev, [row.id]: willExpand };
    });
  }

  async function updateLifecycleComment(row: ActivityRow, parentCommentInput: string) {
    if (row.status === "DUE") return;
    const parentComment = parentCommentInput.trim();
    setLogCommentBusy((prev) => ({ ...prev, [row.id]: true }));
    setErr(null);
    try {
      const res = await fetch("/api/admin/approvals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completionId: row.id, parentComment }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || `Failed (${res.status})`);
      setLogCommentDrafts((prev) => ({ ...prev, [row.id]: parentComment }));
      setLogCommentEditMode((prev) => ({ ...prev, [row.id]: false }));
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLogCommentBusy((prev) => ({ ...prev, [row.id]: false }));
    }
  }

  function setAllLifecycleRowsExpanded(nextExpanded: boolean) {
    setExpandedLogRows((prev) => {
      const next = { ...prev };
      for (const row of expandableLifecycleRows) {
        next[row.id] = nextExpanded;
      }
      return next;
    });
    if (nextExpanded) {
      setLogCommentDrafts((prev) => {
        const next = { ...prev };
        for (const row of expandableLifecycleRows) {
          if (next[row.id] === undefined) next[row.id] = row.parentComment ?? "";
        }
        return next;
      });
    }
    setLogCommentEditMode((prev) => {
      const next = { ...prev };
      for (const row of expandableLifecycleRows) {
        next[row.id] = false;
      }
      return next;
    });
  }

  function formatDateTime(value: string | null) {
    if (!value) return "-";
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  }

  function formatDueDay(value: string | null) {
    if (!value) return "-";
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  }

  async function load() {
    setErr(null);
    const res = await fetch("/api/admin/approvals", { cache: "no-store" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j?.error || `Failed (${res.status})`);
    setPendingRows(Array.isArray(j.pending) ? j.pending : []);
    setRejectedRows(Array.isArray(j.rejected) ? j.rejected : []);
    setActivityRows(Array.isArray(j.activity) ? j.activity : []);
  }

  React.useEffect(() => {
    if (status === "authenticated" && role === "ADULT") load().catch((e) => setErr(String(e?.message || e)));
  }, [status, role]);

  React.useEffect(() => {
    setLogPage(0);
  }, [view, logStatusFilter, logKidFilter, logChoreFilter, logRowsPerPage]);

  function resetLogFilters() {
    setLogStatusFilter("ALL");
    setLogKidFilter("ALL");
    setLogChoreFilter("ALL");
  }

  async function act(id: string, action: "APPROVE" | "REJECT") {
    setBusy((b) => ({ ...b, [id]: true }));
    setErr(null);
    try {
      const parentComment = (comments[id] ?? "").trim();
      if (action === "REJECT" && !parentComment) {
        throw new Error("Please add a comment before rejecting.");
      }

      const res = await fetch("/api/admin/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completionId: id, action, parentComment }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || `Failed (${res.status})`);
      await load();
      window.dispatchEvent(new Event("notifications:refresh"));
      setComments((r) => ({ ...r, [id]: "" }));
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
        <Typography>Loading...</Typography>
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
        <Typography color="text.secondary">Approve or reject kids completed chores.</Typography>
      </Box>

      {err && <Alert severity="error">{err}</Alert>}

      <Stack direction="row" alignItems="flex-end" justifyContent="space-between" sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={view} onChange={(_, next) => setView(next)} aria-label="approvals view">
          <Tab value="today" label={`Today (${todayCount})`} />
          <Tab value="past" label={`Past (${pastCount})`} />
        </Tabs>
        <Link
          component="button"
          type="button"
          underline="hover"
          onClick={() => setLogModalOpen(true)}
          sx={{
            mb: 1.1,
            mr: 1,
            fontSize: 14,
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          <HistoryRoundedIcon sx={{ fontSize: 16 }} />
          History
        </Link>
      </Stack>

      {!hasLoaded && (
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress size={22} />
          <Typography>Loading approval tasks...</Typography>
        </Stack>
      )}

      {hasLoaded && todayCount === 0 && pastCount === 0 && <Alert severity="success">No approval tasks</Alert>}

      {hasLoaded && visiblePending.length === 0 && visibleRejected.length === 0 && (
        <Alert severity="info">No {view} approval tasks.</Alert>
      )}

      {visiblePending.map((r) => (
        <Card key={r.id} variant="outlined" data-testid={`approval-card-${r.id}`}>
          <CardContent>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" gap={2} alignItems="flex-start">
                <Box>
                  <Typography variant="h6">{r.chore.title}</Typography>
                  <Typography color="text.secondary">
                    Kid: <b>{r.kid.name || r.kid.email}</b>
                  </Typography>
                  <Typography color="text.secondary">Completed by kid: {formatDateTime(r.completedAt)}</Typography>
                  <Typography color="text.secondary">Due day: {formatDueDay(r.dueDate)}</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center">
                    <Chip label={`${r.pointsEarned} pts`} size="small" />
                    <Chip label={view === "past" ? "Pending (past)" : "Pending"} size="small" color="warning" />
                  </Stack>
                </Box>

                <Stack direction="row" spacing={1}>
                  <Button
                    data-testid={`approval-approve-${r.id}`}
                    variant="contained"
                    disabled={busy[r.id]}
                    onClick={() => act(r.id, "APPROVE")}
                  >
                    Approve
                  </Button>
                  <Button
                    data-testid={`approval-reject-${r.id}`}
                    variant="outlined"
                    color="error"
                    disabled={busy[r.id] || !(comments[r.id] ?? "").trim()}
                    onClick={() => act(r.id, "REJECT")}
                  >
                    Reject
                  </Button>
                </Stack>
              </Stack>

              <TextField
                label="Parent comment (required to reject)"
                placeholder="Add feedback for approval or what should be fixed."
                value={comments[r.id] ?? ""}
                onChange={(e) => setComments((prev) => ({ ...prev, [r.id]: e.target.value }))}
                size="small"
                fullWidth
              />
            </Stack>
          </CardContent>
        </Card>
      ))}

      {visibleRejected.map((r) => (
        <Card key={r.id} variant="outlined" data-testid={`rejected-card-${r.id}`}>
          <CardContent>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" gap={2} alignItems="flex-start">
                <Box>
                  <Typography variant="h6">{r.chore.title}</Typography>
                  <Typography color="text.secondary">
                    Kid: <b>{r.kid.name || r.kid.email}</b>
                  </Typography>
                  <Typography color="text.secondary">Completed by kid: {formatDateTime(r.completedAt)}</Typography>
                  <Typography color="text.secondary">Due day: {formatDueDay(r.dueDate)}</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center">
                    <Chip label={`${r.pointsEarned} pts`} size="small" />
                    <Chip label={view === "past" ? "Rejected (past)" : "Rejected"} size="small" color="error" />
                  </Stack>
                  {view === "past" && (
                    <Typography color="text.secondary" sx={{ mt: 1, fontStyle: "italic" }}>
                      Rejected on: {formatDateTime(r.rejectionDate)}
                    </Typography>
                  )}
                  {r.parentComment && (
                    <Alert severity="error" sx={{ mt: 1.5, py: 0 }}>
                      Previous parent note: {r.parentComment}
                    </Alert>
                  )}
                </Box>

                <Button
                  data-testid={`approval-reapprove-${r.id}`}
                  variant="contained"
                  color="success"
                  disabled={busy[r.id]}
                  onClick={() => act(r.id, "APPROVE")}
                >
                  Approve retroactively
                </Button>
              </Stack>

              <TextField
                label="Approval comment (optional)"
                placeholder="Optional note for the kid."
                value={comments[r.id] ?? ""}
                onChange={(e) => setComments((prev) => ({ ...prev, [r.id]: e.target.value }))}
                size="small"
                fullWidth
              />
            </Stack>
          </CardContent>
        </Card>
      ))}

      <Dialog
        open={logModalOpen}
        onClose={() => setLogModalOpen(false)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle sx={{ pr: 6 }}>
          History
          <IconButton
            aria-label="Close history"
            onClick={() => setLogModalOpen(false)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1.5 }}>
          {!hasLoaded && (
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 1 }}>
              <CircularProgress size={20} />
              <Typography color="text.secondary">Loading lifecycle log...</Typography>
            </Stack>
          )}
          {hasLoaded && (
            <Typography color="text.secondary" sx={{ mb: 1.5 }}>
              Full history of completion, rejection, and approval status.
            </Typography>
          )}
          {hasLoaded && (
            <Paper variant="outlined" sx={{ overflow: "hidden" }}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ px: 1, py: 0.75, borderBottom: 1, borderColor: "divider" }}
          >
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
              <IconButton
                size="small"
                aria-label="Open log filters"
                color={hasActiveLogFilters ? "primary" : "default"}
                onClick={(e) => setFilterAnchorEl(e.currentTarget)}
              >
                <FilterListRoundedIcon fontSize="small" />
              </IconButton>
            </Stack>

            <Stack
              direction="row"
              spacing={0.75}
              useFlexGap
              sx={{ minWidth: 0, flex: 1, overflowX: "auto", py: 0.25, px: 0.5 }}
            >
              {logStatusFilter !== "ALL" && (
                <Chip size="small" label={`Status: ${logStatusFilter}`} onDelete={() => setLogStatusFilter("ALL")} />
              )}
              {logKidFilter !== "ALL" && (
                <Chip
                  size="small"
                  label={`Kid: ${lifecycleKidLabelById.get(logKidFilter) ?? "Unknown"}`}
                  onDelete={() => setLogKidFilter("ALL")}
                />
              )}
              {logChoreFilter !== "ALL" && (
                <Chip
                  size="small"
                  label={`Chore: ${lifecycleChoreLabelById.get(logChoreFilter) ?? "Unknown"}`}
                  onDelete={() => setLogChoreFilter("ALL")}
                />
              )}
            </Stack>
            {expandableLifecycleRows.length > 0 && (
              <Button
                size="small"
                onClick={() => setAllLifecycleRowsExpanded(!allLifecycleRowsExpanded)}
                startIcon={allLifecycleRowsExpanded ? <UnfoldLessRoundedIcon fontSize="small" /> : <UnfoldMoreRoundedIcon fontSize="small" />}
                sx={{ flexShrink: 0, textTransform: "none", minWidth: 0 }}
              >
                {allLifecycleRowsExpanded ? "Compact" : "Expand"}
              </Button>
            )}
          </Stack>

          <Popover
            open={filterPopoverOpen}
            anchorEl={filterAnchorEl}
            onClose={() => setFilterAnchorEl(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
          >
            <Stack spacing={1.25} sx={{ p: 1.5, width: 280 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={logStatusFilter}
                  label="Status"
                  onChange={(e) =>
                    setLogStatusFilter(e.target.value as "ALL" | "PENDING" | "REJECTED" | "APPROVED" | "DUE")
                  }
                >
                  <MenuItem value="ALL">All statuses</MenuItem>
                  <MenuItem value="DUE">Due (not completed)</MenuItem>
                  <MenuItem value="PENDING">Pending</MenuItem>
                  <MenuItem value="REJECTED">Rejected</MenuItem>
                  <MenuItem value="APPROVED">Approved</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel>Kid</InputLabel>
                <Select value={logKidFilter} label="Kid" onChange={(e) => setLogKidFilter(String(e.target.value))}>
                  <MenuItem value="ALL">All kids</MenuItem>
                  {lifecycleKidOptions.map((kid) => (
                    <MenuItem key={kid.id} value={kid.id}>
                      {kid.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel>Chore</InputLabel>
                <Select
                  value={logChoreFilter}
                  label="Chore"
                  onChange={(e) => setLogChoreFilter(String(e.target.value))}
                >
                  <MenuItem value="ALL">All chores</MenuItem>
                  {lifecycleChoreOptions.map((chore) => (
                    <MenuItem key={chore.id} value={chore.id}>
                      {chore.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Button size="small" onClick={resetLogFilters}>
                  Reset
                </Button>
                <Button size="small" onClick={() => setFilterAnchorEl(null)}>
                  Done
                </Button>
              </Stack>
            </Stack>
          </Popover>

          <TableContainer>
            <Table size="small" aria-label="task lifecycle log">
              <TableHead>
                <TableRow>
                  <TableCell width={44} />
                  <TableCell sortDirection={logSortBy === "chore" ? logSortDirection : false}>
                    <TableSortLabel
                      active={logSortBy === "chore"}
                      direction={logSortBy === "chore" ? logSortDirection : "asc"}
                      onClick={() => setLogSort("chore")}
                    >
                      Chore
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={logSortBy === "kid" ? logSortDirection : false}>
                    <TableSortLabel
                      active={logSortBy === "kid"}
                      direction={logSortBy === "kid" ? logSortDirection : "asc"}
                      onClick={() => setLogSort("kid")}
                    >
                      Kid
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={logSortBy === "status" ? logSortDirection : false}>
                    <TableSortLabel
                      active={logSortBy === "status"}
                      direction={logSortBy === "status" ? logSortDirection : "asc"}
                      onClick={() => setLogSort("status")}
                    >
                      Status
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={logSortBy === "dueDate" ? logSortDirection : false}>
                    <TableSortLabel
                      active={logSortBy === "dueDate"}
                      direction={logSortBy === "dueDate" ? logSortDirection : "asc"}
                      onClick={() => setLogSort("dueDate")}
                    >
                      Due on
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={logSortBy === "completedAt" ? logSortDirection : false}>
                    <TableSortLabel
                      active={logSortBy === "completedAt"}
                      direction={logSortBy === "completedAt" ? logSortDirection : "asc"}
                      onClick={() => setLogSort("completedAt")}
                    >
                      Completed on
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={logSortBy === "rejectionDate" ? logSortDirection : false}>
                    <TableSortLabel
                      active={logSortBy === "rejectionDate"}
                      direction={logSortBy === "rejectionDate" ? logSortDirection : "asc"}
                      onClick={() => setLogSort("rejectionDate")}
                    >
                      Rejected on
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={logSortBy === "approvedAt" ? logSortDirection : false}>
                    <TableSortLabel
                      active={logSortBy === "approvedAt"}
                      direction={logSortBy === "approvedAt" ? logSortDirection : "asc"}
                      onClick={() => setLogSort("approvedAt")}
                    >
                      Approved on
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lifecyclePageRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Typography color="text.secondary" sx={{ py: 1.5 }}>
                        No lifecycle entries match the current filters.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {lifecyclePageRows.map((row) => {
                  const canEditComment = row.status !== "DUE";
                  const hasComment = !!row.parentComment?.trim();
                  const isExpanded = !!expandedLogRows[row.id];
                  const isEditingComment = !!logCommentEditMode[row.id];
                  const commentDraft = logCommentDrafts[row.id] ?? row.parentComment ?? "";
                  const trimmedDraft = commentDraft.trim();
                  const trimmedExisting = (row.parentComment ?? "").trim();
                  const commentChanged = trimmedDraft !== trimmedExisting;
                  const commentBusy = !!logCommentBusy[row.id];
                  return (
                    <React.Fragment key={row.id}>
                      <TableRow
                        hover
                        data-testid={`approval-log-row-${row.id}`}
                        onClick={canEditComment ? () => toggleLogRow(row) : undefined}
                        onMouseEnter={() => setHoveredLogRowId(row.id)}
                        onMouseLeave={() => setHoveredLogRowId((prev) => (prev === row.id ? null : prev))}
                        sx={{
                          ...(canEditComment ? { cursor: "pointer" } : {}),
                          ...(isExpanded ? { "& > *": { borderBottom: 0 } } : {}),
                          ...(hoveredLogRowId === row.id ? { bgcolor: "action.hover" } : {}),
                        }}
                      >
                        <TableCell>
                          {canEditComment && (
                            <IconButton
                              size="small"
                              aria-label={isExpanded ? "Collapse comment editor" : "Expand comment editor"}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLogRow(row);
                              }}
                            >
                              {isExpanded ? <KeyboardArrowUpRoundedIcon fontSize="small" /> : <KeyboardArrowDownRoundedIcon fontSize="small" />}
                            </IconButton>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography>{row.chore.title}</Typography>
                        </TableCell>
                        <TableCell>{row.kid.name || row.kid.email}</TableCell>
                        <TableCell>
                        <Chip
                          size="small"
                          label={row.status}
                          color={
                            row.status === "APPROVED"
                              ? "success"
                              : row.status === "REJECTED"
                                ? "error"
                                : row.status === "DUE"
                                  ? "info"
                                  : "warning"
                          }
                        />
                        </TableCell>
                        <TableCell>{formatDueDay(row.dueDate)}</TableCell>
                        <TableCell>{formatDateTime(row.completedAt)}</TableCell>
                        <TableCell>{formatDateTime(row.rejectionDate)}</TableCell>
                        <TableCell>{formatDateTime(row.approvedAt)}</TableCell>
                      </TableRow>
                      {canEditComment && isExpanded && (
                        <TableRow
                          data-testid={`approval-log-comment-${row.id}`}
                          onMouseEnter={() => setHoveredLogRowId(row.id)}
                          onMouseLeave={() => setHoveredLogRowId((prev) => (prev === row.id ? null : prev))}
                          sx={{
                            borderTop: 0,
                            ...(hoveredLogRowId === row.id ? { bgcolor: "action.hover" } : {}),
                          }}
                        >
                          <TableCell sx={{ py: 0 }} />
                          <TableCell colSpan={7} sx={{ pt: 0.25, pb: 2, verticalAlign: "top" }}>
                            <Stack spacing={0.9}>
                              <Typography variant="caption" color="text.secondary">
                                Parent comment
                              </Typography>
                              {!isEditingComment ? (
                                <Stack direction="row" spacing={0.35} alignItems="flex-start">
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontStyle: hasComment ? "normal" : "italic",
                                      color: hasComment ? "text.primary" : "text.secondary",
                                      overflowWrap: "anywhere",
                                    }}
                                  >
                                    {hasComment ? row.parentComment : "No comment yet."}
                                  </Typography>
                                  <Stack
                                    direction="row"
                                    spacing={0.1}
                                    alignItems="center"
                                    sx={{
                                      flexShrink: 0,
                                      mt: -0.05,
                                      border: "1px solid",
                                      borderColor: "divider",
                                      borderRadius: "999px",
                                      px: 0.15,
                                      py: 0.05,
                                      bgcolor: "rgba(255,255,255,0.75)",
                                    }}
                                  >
                                    <IconButton
                                      size="small"
                                      aria-label={hasComment ? "Edit comment" : "Add comment"}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setLogCommentDrafts((prev) => ({
                                          ...prev,
                                          [row.id]: row.parentComment ?? "",
                                        }));
                                        setLogCommentEditMode((prev) => ({
                                          ...prev,
                                          [row.id]: true,
                                        }));
                                      }}
                                      disabled={commentBusy}
                                      data-testid={`approval-log-comment-edit-${row.id}`}
                                      sx={{ p: 0.2 }}
                                    >
                                      <EditRoundedIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                    {trimmedExisting && (
                                      <IconButton
                                        size="small"
                                        color="error"
                                        aria-label="Remove comment"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          void updateLifecycleComment(row, "");
                                        }}
                                        disabled={commentBusy}
                                        data-testid={`approval-log-comment-remove-${row.id}`}
                                        sx={{ p: 0.2 }}
                                      >
                                        <DeleteOutlineRoundedIcon sx={{ fontSize: 14 }} />
                                      </IconButton>
                                    )}
                                  </Stack>
                                </Stack>
                              ) : (
                                <Stack direction="row" spacing={0.6} alignItems="flex-start">
                                  <Box
                                    sx={{
                                      flex: 1,
                                      animation: "approvalCommentFieldIn 180ms ease-out",
                                      "@keyframes approvalCommentFieldIn": {
                                        "0%": { opacity: 0, transform: "translateX(-8px)" },
                                        "100%": { opacity: 1, transform: "translateX(0)" },
                                      },
                                    }}
                                  >
                                    <TextField
                                      value={commentDraft}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) =>
                                        setLogCommentDrafts((prev) => ({
                                          ...prev,
                                          [row.id]: e.target.value,
                                        }))
                                      }
                                      placeholder="Add a note for this task"
                                      size="small"
                                      fullWidth
                                      multiline
                                      minRows={1}
                                      maxRows={3}
                                      inputProps={{ "data-testid": `approval-log-comment-input-${row.id}` }}
                                      autoFocus
                                    />
                                  </Box>
                                  <Stack
                                    direction="row"
                                    spacing={0.1}
                                    alignItems="center"
                                    sx={{
                                      flexShrink: 0,
                                      pt: 0.2,
                                      border: "1px solid",
                                      borderColor: "divider",
                                      borderRadius: "999px",
                                      px: 0.15,
                                      py: 0.05,
                                      bgcolor: "rgba(255,255,255,0.75)",
                                    }}
                                  >
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      aria-label="Save comment"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        void updateLifecycleComment(row, commentDraft);
                                      }}
                                      disabled={commentBusy || !commentChanged}
                                      data-testid={`approval-log-comment-save-${row.id}`}
                                      sx={{ p: 0.2 }}
                                    >
                                      <CheckRoundedIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      aria-label="Cancel comment edit"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setLogCommentDrafts((prev) => ({
                                          ...prev,
                                          [row.id]: row.parentComment ?? "",
                                        }));
                                        setLogCommentEditMode((prev) => ({
                                          ...prev,
                                          [row.id]: false,
                                        }));
                                      }}
                                      disabled={commentBusy}
                                      sx={{ p: 0.2 }}
                                    >
                                      <CloseRoundedIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                  </Stack>
                                </Stack>
                              )}
                              {commentBusy && (
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <CircularProgress size={14} />
                                  <Typography variant="caption" color="text.secondary">
                                    Saving…
                                  </Typography>
                                </Stack>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={lifecycleFilteredRows.length}
            page={logPage}
            onPageChange={(_, next) => setLogPage(next)}
            rowsPerPage={logRowsPerPage}
            rowsPerPageOptions={[10, 15]}
            onRowsPerPageChange={(e) => {
              const next = Math.min(15, Number(e.target.value));
              setLogRowsPerPage(next);
              setLogPage(0);
            }}
          />
            </Paper>
          )}
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
