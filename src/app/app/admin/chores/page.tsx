"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Popover,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import TokenRoundedIcon from "@mui/icons-material/TokenRounded";

type Kid = { id: string; name: string | null; email: string; avatarUrl?: string | null };
type Frequency = "DAILY" | "WEEKLY";

type ChoreRow = {
  id: string;
  title: string;
  description: string | null;
  points: number;
  active: boolean;
  assignedKidIds: string[];
  schedule: { frequency: Frequency; dayOfWeek: number | null };
};

type ActiveFilter = "ALL" | "ACTIVE" | "INACTIVE";
type FrequencyFilter = "ALL" | "DAILY" | "WEEKLY";
type AssigneeOperator = "ANY" | "ALL" | "NONE";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AdminChoresPage() {
  const { data: session, status } = useSession();
  const role = (session?.user as any)?.role as "ADULT" | "KID" | undefined;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [kids, setKids] = React.useState<Kid[]>([]);
  const [chores, setChores] = React.useState<ChoreRow[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<ActiveFilter>("ALL");
  const [frequencyFilter, setFrequencyFilter] = React.useState<FrequencyFilter>("ALL");
  const [assigneeOperator, setAssigneeOperator] = React.useState<AssigneeOperator>("ANY");
  const [assigneeFilterIds, setAssigneeFilterIds] = React.useState<string[]>([]);
  const [filterAnchorEl, setFilterAnchorEl] = React.useState<HTMLElement | null>(null);
  const [searchOpen, setSearchOpen] = React.useState(false);

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ChoreRow | null>(null);

  const [form, setForm] = React.useState({
    title: "",
    description: "",
    points: 2,
    active: true,
    assignedKidIds: [] as string[],
    frequency: "DAILY" as Frequency,
    dayOfWeek: 1,
  });

  const hasActiveFilters =
    searchQuery.trim().length > 0
    || activeFilter !== "ALL"
    || frequencyFilter !== "ALL"
    || assigneeFilterIds.length > 0;

  const kidById = React.useMemo(() => {
    return new Map(kids.map((k) => [k.id, k] as const));
  }, [kids]);

  async function load() {
    setErr(null);
    const [metaRes, choresRes] = await Promise.all([
      fetch("/api/admin/meta", { cache: "no-store" }),
      fetch("/api/admin/chores", { cache: "no-store" }),
    ]);

    if (!metaRes.ok) throw new Error((await metaRes.json().catch(() => ({})))?.error || "Failed to load kids");
    if (!choresRes.ok) throw new Error((await choresRes.json().catch(() => ({})))?.error || "Failed to load chores");

    const meta = await metaRes.json();
    const data = await choresRes.json();
    setKids(meta.kids);
    setChores(data.chores);
  }

  React.useEffect(() => {
    if (status === "authenticated" && role === "ADULT") load().catch((e) => setErr(String(e?.message || e)));
  }, [status, role]);

  function openCreate() {
    setEditing(null);
    setForm({
      title: "",
      description: "",
      points: 2,
      active: true,
      assignedKidIds: [],
      frequency: "DAILY",
      dayOfWeek: 1,
    });
    setOpen(true);
  }

  function openEdit(c: ChoreRow) {
    setEditing(c);
    setForm({
      title: c.title,
      description: c.description ?? "",
      points: c.points,
      active: c.active,
      assignedKidIds: c.assignedKidIds,
      frequency: c.schedule.frequency,
      dayOfWeek: c.schedule.dayOfWeek ?? 1,
    });
    setOpen(true);
  }

  async function save() {
    setErr(null);
    const payload = {
      ...(editing ? { id: editing.id } : {}),
      title: form.title,
      description: form.description || null,
      points: Number(form.points),
      active: form.active,
      assignedKidIds: form.assignedKidIds,
      frequency: form.frequency,
      dayOfWeek: form.frequency === "WEEKLY" ? Number(form.dayOfWeek) : null,
    };

    const res = await fetch("/api/admin/chores", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j?.error || "Save failed");

    setOpen(false);
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this chore? This cannot be undone.")) return;
    setErr(null);
    const res = await fetch("/api/admin/chores", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j?.error || "Delete failed");
    await load();
  }

  function resetFilters() {
    setSearchQuery("");
    setActiveFilter("ALL");
    setFrequencyFilter("ALL");
    setAssigneeOperator("ANY");
    setAssigneeFilterIds([]);
  }

  const filteredChores = React.useMemo(() => {
    if (!chores) return null;
    const q = searchQuery.trim().toLowerCase();

    return chores.filter((c) => {
      const activeOk =
        activeFilter === "ALL"
        || (activeFilter === "ACTIVE" ? c.active : !c.active);
      const frequencyOk =
        frequencyFilter === "ALL"
        || c.schedule.frequency === frequencyFilter;
      const assigneeOk = assigneeFilterIds.length === 0
        ? true
        : assigneeOperator === "ANY"
          ? assigneeFilterIds.some((id) => c.assignedKidIds.includes(id))
          : assigneeOperator === "ALL"
            ? assigneeFilterIds.every((id) => c.assignedKidIds.includes(id))
            : assigneeFilterIds.every((id) => !c.assignedKidIds.includes(id));
      const searchOk = !q
        || c.title.toLowerCase().includes(q)
        || (c.description ?? "").toLowerCase().includes(q);

      return activeOk && frequencyOk && assigneeOk && searchOk;
    });
  }, [chores, searchQuery, activeFilter, frequencyFilter, assigneeOperator, assigneeFilterIds]);

  const sortedChores = React.useMemo(() => {
    if (!filteredChores) return null;
    return [...filteredChores].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
  }, [filteredChores]);

  function kidInitial(kid: Kid | undefined) {
    const source = (kid?.name ?? kid?.email ?? "?").trim();
    return source.charAt(0).toUpperCase() || "?";
  }

  function kidLabel(kid: Kid | undefined) {
    return kid?.name || kid?.email || "Unknown kid";
  }

  function kidColor(kidId: string) {
    const palette = [
      "#1E88E5",
      "#43A047",
      "#8E24AA",
      "#FB8C00",
      "#E53935",
      "#00ACC1",
      "#6D4C41",
      "#7CB342",
    ];
    let hash = 0;
    for (let i = 0; i < kidId.length; i += 1) {
      hash = ((hash * 31) + kidId.charCodeAt(i)) >>> 0;
    }
    return palette[hash % palette.length];
  }

  function sortedAssignedKidIds(ids: string[]) {
    return [...ids].sort((a, b) => {
      const kidA = kidById.get(a);
      const kidB = kidById.get(b);
      const labelA = (kidA?.name || kidA?.email || a).toLowerCase();
      const labelB = (kidB?.name || kidB?.email || b).toLowerCase();
      const byLabel = labelA.localeCompare(labelB);
      if (byLabel !== 0) return byLabel;
      return a.localeCompare(b);
    });
  }

  function visibleAssignedKidIds(ids: string[]) {
    return sortedAssignedKidIds(ids).filter((id) => kidById.has(id));
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
        <Typography variant="h4">Chores</Typography>
        <Typography color="text.secondary">Create chores, assign kids, and schedule weekly.</Typography>
      </Box>

      {err && <Alert severity="error">{err}</Alert>}

      {!chores && (
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress size={22} />
          <Typography>Loading chores…</Typography>
        </Stack>
      )}

      {sortedChores && (
        <Stack spacing={0.5}>
          {chores && filteredChores && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ alignSelf: "flex-end", pr: 0.5 }}
            >
              Showing {filteredChores.length} of {chores.length} chores
            </Typography>
          )}

          <Box
            sx={{
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
              bgcolor: "common.white",
              overflow: "hidden",
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ px: 1, py: 0.75, borderBottom: 1, borderColor: "divider" }}
            >
              <Stack
                direction="row"
                spacing={0.5}
                alignItems="center"
                sx={{ flexShrink: 0 }}
              >
                <IconButton
                  size="small"
                  aria-label="Open filters"
                  color={hasActiveFilters ? "primary" : "default"}
                  onClick={(e) => setFilterAnchorEl(e.currentTarget)}
                >
                  <FilterListRoundedIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  aria-label="Toggle search"
                  color={searchQuery.trim() !== "" || searchOpen ? "primary" : "default"}
                  onClick={() => setSearchOpen((prev) => !prev)}
                >
                  <SearchRoundedIcon fontSize="small" />
                </IconButton>

                <Box
                  sx={{
                    overflow: "hidden",
                    maxWidth: searchOpen ? (isMobile ? 190 : 240) : 0,
                    opacity: searchOpen ? 1 : 0,
                    transform: searchOpen ? "translateX(0)" : "translateX(-10px)",
                    transition: "max-width 180ms ease, opacity 180ms ease, transform 180ms ease",
                  }}
                >
                  <TextField
                    size="small"
                    placeholder="Search title"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ width: isMobile ? 170 : 220 }}
                    inputProps={{ "aria-label": "Search chores" }}
                    InputProps={{
                      endAdornment: searchQuery ? (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            aria-label="Clear search"
                            onClick={() => setSearchQuery("")}
                            edge="end"
                          >
                            <CloseRoundedIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ) : undefined,
                    }}
                  />
                </Box>
              </Stack>

              <Stack
                direction="row"
                spacing={0.75}
                useFlexGap
                sx={{ minWidth: 0, flex: 1, overflowX: "auto", py: 0.25, px: 0.5 }}
              >
                {searchQuery.trim() !== "" && (
                  <Chip
                    size="small"
                    label={`Title: ${searchQuery.trim()}`}
                    onDelete={() => setSearchQuery("")}
                  />
                )}
                {activeFilter !== "ALL" && (
                  <Chip
                    size="small"
                    label={`Status: ${activeFilter === "ACTIVE" ? "Active" : "Inactive"}`}
                    onDelete={() => setActiveFilter("ALL")}
                  />
                )}
                {frequencyFilter !== "ALL" && (
                  <Chip
                    size="small"
                    label={`Frequency: ${frequencyFilter === "DAILY" ? "Daily" : "Weekly"}`}
                    onDelete={() => setFrequencyFilter("ALL")}
                  />
                )}
                {assigneeFilterIds.length > 0 && (
                  <Chip
                    size="small"
                    label={`Assignees: ${assigneeOperator === "ANY" ? "Any of" : assigneeOperator === "ALL" ? "All of" : "None of"}`}
                    onDelete={() => {
                      setAssigneeOperator("ANY");
                      setAssigneeFilterIds([]);
                    }}
                  />
                )}
                {assigneeFilterIds.map((kidId) => (
                  <Chip
                    key={kidId}
                    size="small"
                    label={kidLabel(kidById.get(kidId))}
                    onDelete={() => setAssigneeFilterIds((prev) => prev.filter((id) => id !== kidId))}
                  />
                ))}
              </Stack>

              <Tooltip title="Add chore" disableHoverListener={!isMobile}>
                <Button
                  size="small"
                  variant="contained"
                  aria-label="Add chore"
                  onClick={openCreate}
                  startIcon={isMobile ? undefined : <AddRoundedIcon fontSize="small" />}
                  sx={{
                    minWidth: isMobile ? 34 : "auto",
                    px: isMobile ? 0.75 : 1.2,
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  {isMobile ? <AddRoundedIcon fontSize="small" /> : "Add chore"}
                </Button>
              </Tooltip>
            </Stack>

            <Popover
              open={Boolean(filterAnchorEl)}
              anchorEl={filterAnchorEl}
              onClose={() => setFilterAnchorEl(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
              transformOrigin={{ vertical: "top", horizontal: "left" }}
            >
              <Stack spacing={1.25} sx={{ p: 1.5, width: 320 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={activeFilter}
                    label="Status"
                    onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
                  >
                    <MenuItem value="ALL">All statuses</MenuItem>
                    <MenuItem value="ACTIVE">Active</MenuItem>
                    <MenuItem value="INACTIVE">Inactive</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel>Frequency</InputLabel>
                  <Select
                    value={frequencyFilter}
                    label="Frequency"
                    onChange={(e) => setFrequencyFilter(e.target.value as FrequencyFilter)}
                  >
                    <MenuItem value="ALL">All frequencies</MenuItem>
                    <MenuItem value="DAILY">Daily</MenuItem>
                    <MenuItem value="WEEKLY">Weekly</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel>Assignees</InputLabel>
                  <Select
                    multiple
                    value={assigneeFilterIds}
                    label="Assignees"
                    onChange={(e) => setAssigneeFilterIds(e.target.value as string[])}
                    input={<OutlinedInput label="Assignees" />}
                    renderValue={(selected) => {
                      const ids = selected as string[];
                      if (ids.length === 0) return "All assignees";
                      return ids.map((id) => kidLabel(kidById.get(id))).join(", ");
                    }}
                  >
                    {kids.map((k) => (
                      <MenuItem key={k.id} value={k.id}>
                        {k.name || k.email}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel>Assignee operator</InputLabel>
                  <Select
                    value={assigneeOperator}
                    label="Assignee operator"
                    onChange={(e) => setAssigneeOperator(e.target.value as AssigneeOperator)}
                    disabled={assigneeFilterIds.length === 0}
                  >
                    <MenuItem value="ANY">Any of</MenuItem>
                    <MenuItem value="ALL">All of</MenuItem>
                    <MenuItem value="NONE">None of</MenuItem>
                  </Select>
                </FormControl>

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Button size="small" onClick={resetFilters}>
                    Reset
                  </Button>
                  <Button size="small" onClick={() => setFilterAnchorEl(null)}>
                    Done
                  </Button>
                </Stack>
              </Stack>
            </Popover>

            <Stack sx={{ bgcolor: "common.white" }}>
              {sortedChores.length === 0 && (
                <Box sx={{ px: 2, py: 3 }}>
                  <Typography color="text.secondary" textAlign="center">
                    No chores match the selected filters.
                  </Typography>
                </Box>
              )}
              {sortedChores.map((c, idx) => (
                <Box
                  key={c.id}
                  onClick={() => openEdit(c)}
                  sx={{
                    px: 1.25,
                    py: 0.75,
                    cursor: "pointer",
                    borderTop: idx === 0 ? "none" : "1px solid",
                    borderColor: "divider",
                    transition: "background-color 140ms ease",
                    bgcolor: c.active ? undefined : "rgba(120, 120, 120, 0.05)",
                    opacity: c.active ? 1 : 0.82,
                    "&:hover": { bgcolor: c.active ? "action.hover" : "rgba(120, 120, 120, 0.1)", opacity: 1 },
                    "&:hover .chore-description-text": { color: "text.primary" },
                  }}
                >
                  <Stack spacing={0}>
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ minWidth: 0, gap: 0.75 }}>
                      <Typography
                        fontWeight={600}
                        variant="body2"
                        title={c.title}
                        sx={{ minWidth: 0, flex: 1, whiteSpace: "normal", wordBreak: "break-word" }}
                      >
                        {c.title}
                      </Typography>
                      <Chip
                        size="small"
                        variant="outlined"
                        label={c.active ? "Active" : "Inactive"}
                        sx={{
                          height: 18,
                          flexShrink: 0,
                          "& .MuiChip-label": { px: 0.6, fontSize: "0.66rem" },
                          ...(c.active
                            ? {
                              color: "info.dark",
                              borderColor: "rgba(25, 118, 210, 0.38)",
                              bgcolor: "rgba(25, 118, 210, 0.10)",
                            }
                            : {
                              color: "text.secondary",
                              borderColor: "rgba(120, 120, 120, 0.35)",
                              bgcolor: "rgba(120, 120, 120, 0.10)",
                            }),
                        }}
                      />
                    </Stack>
                    {c.description && (
                      <Typography
                        className="chore-description-text"
                        variant="caption"
                        color="text.secondary"
                        sx={{ whiteSpace: "normal", wordBreak: "break-word" }}
                      >
                        {c.description}
                      </Typography>
                    )}
                    <Stack
                      direction="row"
                      spacing={0.35}
                      useFlexGap
                      flexWrap="wrap"
                      alignItems="center"
                      sx={{
                        mt: 0.6,
                        "& .meta-pill": { height: 18 },
                        "& .meta-pill .MuiChip-label": { px: 0.6, fontSize: "0.66rem" },
                        "& .meta-pill .MuiChip-icon": { fontSize: 13, ml: 0.5 },
                      }}
                    >
                      <Chip
                        className="meta-pill"
                        size="small"
                        color="warning"
                        variant="outlined"
                        icon={<TokenRoundedIcon />}
                        label={String(c.points)}
                      />
                      <Chip
                        className="meta-pill"
                        label={c.schedule.frequency === "WEEKLY" ? `Weekly: ${DAYS[c.schedule.dayOfWeek ?? 0]}` : "Daily"}
                        size="small"
                        variant="outlined"
                        sx={{
                          color: "text.secondary",
                          borderColor: "rgba(120, 120, 120, 0.35)",
                          bgcolor: "rgba(120, 120, 120, 0.08)",
                        }}
                      />
                      <Box sx={{ ml: 0.35, display: "flex", alignItems: "center" }}>
                        {visibleAssignedKidIds(c.assignedKidIds).length === 0 ? (
                          <Typography variant="caption" color="text.secondary">-</Typography>
                        ) : (
                          <Stack direction="row" spacing={0.2}>
                            {visibleAssignedKidIds(c.assignedKidIds).map((kidId) => {
                              const kid = kidById.get(kidId);
                              const bg = kidColor(kidId);
                              return (
                                <Tooltip key={kidId} title={kidLabel(kid)} arrow>
                                  <Avatar
                                    src={kid?.avatarUrl || undefined}
                                    sx={{
                                      width: 16,
                                      height: 16,
                                      fontSize: "0.58rem",
                                      bgcolor: bg,
                                    }}
                                  >
                                    {kidInitial(kid)}
                                  </Avatar>
                                </Tooltip>
                              );
                            })}
                          </Stack>
                        )}
                      </Box>
                    </Stack>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Box>
        </Stack>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Edit chore" : "New chore"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
            <TextField
              label="Points"
              type="number"
              value={form.points}
              onChange={(e) => setForm((f) => ({ ...f, points: Number(e.target.value) }))}
              fullWidth
            />

            <Stack direction="row" spacing={1} alignItems="center">
              <Switch
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              />
              <Typography>{form.active ? "Active" : "Inactive"}</Typography>
            </Stack>

            <FormControl fullWidth>
              <InputLabel>Assign to kids</InputLabel>
              <Select
                multiple
                value={form.assignedKidIds}
                onChange={(e) => setForm((f) => ({ ...f, assignedKidIds: e.target.value as string[] }))}
                input={<OutlinedInput label="Assign to kids" />}
                renderValue={(selected) => {
                  const ids = selected as string[];
                  if (ids.length === 0) return "No kids selected";
                  return (
                    <Stack direction="row" spacing={0.35} sx={{ py: 0.125 }}>
                      {ids.map((kidId) => {
                        const kid = kidById.get(kidId);
                        return (
                          <Tooltip key={kidId} title={kidLabel(kid)} arrow>
                            <Avatar
                              src={kid?.avatarUrl || undefined}
                              sx={{
                                width: 20,
                                height: 20,
                                fontSize: "0.66rem",
                                bgcolor: kidColor(kidId),
                              }}
                            >
                              {kidInitial(kid)}
                            </Avatar>
                          </Tooltip>
                        );
                      })}
                    </Stack>
                  );
                }}
              >
                {kids.map((k) => (
                  <MenuItem key={k.id} value={k.id}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar
                        src={k.avatarUrl || undefined}
                        sx={{
                          width: 22,
                          height: 22,
                          fontSize: "0.7rem",
                          bgcolor: kidColor(k.id),
                        }}
                      >
                        {kidInitial(k)}
                      </Avatar>
                      <Typography variant="body2">{k.name || k.email}</Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Frequency</InputLabel>
              <Select
                value={form.frequency}
                label="Frequency"
                onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value as any }))}
              >
                <MenuItem value="DAILY">Daily</MenuItem>
                <MenuItem value="WEEKLY">Weekly</MenuItem>
              </Select>
            </FormControl>

            {form.frequency === "WEEKLY" && (
              <FormControl fullWidth>
                <InputLabel>Day of week</InputLabel>
                <Select
                  value={String(form.dayOfWeek)}
                  label="Day of week"
                  onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: Number(e.target.value) }))}
                >
                  {DAYS.map((d, idx) => (
                    <MenuItem key={d} value={String(idx)}>
                      {d}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Alert severity="info">
              Kids submitting a completion will be <b>Pending approval</b>. Parents can review these in <b>Approvals</b>.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          {editing && (
            <Button
              color="error"
              onClick={async () => {
                await remove(editing.id);
                setOpen(false);
              }}
            >
              Delete
            </Button>
          )}
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => save()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
