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
  InputAdornment,
  IconButton,
  InputLabel,
  MenuItem,
  Popover,
  Select,
  Stack,
  Switch,
  useMediaQuery,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ChildCareRoundedIcon from "@mui/icons-material/ChildCareRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";

type Member = {
  id: string;
  username: string;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
  role: "ADULT" | "KID";
  isActive?: boolean;
  isHidden?: boolean;
};

type RoleFilter = "ALL" | "ADULT" | "KID";
type ActiveFilter = "ALL" | "ACTIVE" | "DEACTIVATED";
type VisibilityFilter = "ALL" | "VISIBLE" | "HIDDEN";
type SortField = "member" | "role" | "status" | "visibility";
type SortDirection = "asc" | "desc";

const ROLE_CHIP_OPTIONS: Array<{ value: RoleFilter; label: string }> = [
  { value: "ALL", label: "All roles" },
  { value: "KID", label: "Kid" },
  { value: "ADULT", label: "Adult" },
];

const STATUS_CHIP_OPTIONS: Array<{ value: ActiveFilter; label: string }> = [
  { value: "ALL", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "DEACTIVATED", label: "Deactivated" },
];

const VISIBILITY_CHIP_OPTIONS: Array<{ value: VisibilityFilter; label: string }> = [
  { value: "ALL", label: "All visibility" },
  { value: "VISIBLE", label: "Visible" },
  { value: "HIDDEN", label: "Hidden" },
];

export default function FamilyMembersPage() {
  const { data: session, status } = useSession();
  const role = (session?.user as any)?.role as "ADULT" | "KID" | undefined;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [members, setMembers] = React.useState<Member[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [roleFilter, setRoleFilter] = React.useState<RoleFilter>("ALL");
  const [activeFilter, setActiveFilter] = React.useState<ActiveFilter>("ALL");
  const [visibilityFilter, setVisibilityFilter] = React.useState<VisibilityFilter>("ALL");
  const [memberQuery, setMemberQuery] = React.useState("");
  const [sortField, setSortField] = React.useState<SortField>("member");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("asc");
  const [filterAnchorEl, setFilterAnchorEl] = React.useState<HTMLElement | null>(null);
  const [searchOpen, setSearchOpen] = React.useState(false);

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Member | null>(null);

  const [form, setForm] = React.useState({
    username: "",
    email: "",
    name: "",
    avatarUrl: "",
    role: "KID" as "KID" | "ADULT",
    password: "",
    isActive: true,
    isHidden: false,
  });

  const roleFilterLabel = React.useMemo(
    () => ROLE_CHIP_OPTIONS.find((x) => x.value === roleFilter)?.label ?? roleFilter,
    [roleFilter],
  );
  const statusFilterLabel = React.useMemo(
    () => STATUS_CHIP_OPTIONS.find((x) => x.value === activeFilter)?.label ?? activeFilter,
    [activeFilter],
  );
  const visibilityFilterLabel = React.useMemo(
    () => VISIBILITY_CHIP_OPTIONS.find((x) => x.value === visibilityFilter)?.label ?? visibilityFilter,
    [visibilityFilter],
  );
  const hasActiveFilters =
    roleFilter !== "ALL"
    || activeFilter !== "ALL"
    || visibilityFilter !== "ALL"
    || memberQuery.trim().length > 0;
  const filterPopoverOpen = Boolean(filterAnchorEl);
  const tableColumnCount = 4;

  async function load() {
    setErr(null);
    const res = await fetch("/api/admin/family-members", { cache: "no-store" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j?.error || `Failed (${res.status})`);
    setMembers(j.members);
  }

  React.useEffect(() => {
    if (status === "authenticated" && role === "ADULT") load().catch((e) => setErr(String(e?.message || e)));
  }, [status, role]);

  function openCreate() {
    setEditing(null);
    setForm({ username: "", email: "", name: "", avatarUrl: "", role: "KID", password: "", isActive: true, isHidden: false });
    setOpen(true);
  }

  function openEdit(m: Member) {
    setEditing(m);
    setForm({
      username: m.username ?? "",
      email: m.email ?? "",
      name: m.name ?? "",
      avatarUrl: m.avatarUrl ?? "",
      role: m.role,
      password: "",
      isActive: m.isActive ?? true,
      isHidden: m.isHidden ?? false,
    });
    setOpen(true);
  }

  function onAvatarFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErr("Please choose an image file.");
      return;
    }
    if (file.size > 1_500_000) {
      setErr("Image is too large (max 1.5MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        setErr("Could not read image file.");
        return;
      }
      setErr(null);
      setForm((f) => ({ ...f, avatarUrl: result }));
    };
    reader.onerror = () => setErr("Could not read image file.");
    reader.readAsDataURL(file);
  }

  async function save() {
    setErr(null);

    if (!editing) {
      const res = await fetch("/api/admin/family-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          name: form.name || null,
          avatarUrl: form.avatarUrl || null,
          role: form.role,
          password: form.password,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Create failed");
      setOpen(false);
      await load();
      return;
    }

    const res = await fetch("/api/admin/family-members", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editing.id,
        username: form.username,
        email: form.email,
        name: form.name || null,
        avatarUrl: form.avatarUrl || null,
        role: form.role,
        password: form.password || undefined,
        isActive: form.isActive,
        isHidden: form.isHidden,
      }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j?.error || "Update failed");

    setOpen(false);
    await load();
  }

  const filteredMembers = React.useMemo(() => {
    if (!members) return null;
    const q = memberQuery.trim().toLowerCase();

    return members.filter((m) => {
      const isActive = m.isActive ?? true;
      const isHidden = m.isHidden ?? false;
      const haystack = `${m.name ?? ""} ${m.username} ${m.email}`.toLowerCase();

      const roleOk = roleFilter === "ALL" || m.role === roleFilter;
      const activeOk =
        activeFilter === "ALL"
        || (activeFilter === "ACTIVE" ? isActive : !isActive);
      const visibilityOk =
        visibilityFilter === "ALL"
        || (visibilityFilter === "VISIBLE" ? !isHidden : isHidden);
      const searchOk = !q || haystack.includes(q);

      return roleOk && activeOk && visibilityOk && searchOk;
    });
  }, [members, roleFilter, activeFilter, visibilityFilter, memberQuery]);

  function onSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortField(field);
    setSortDirection("asc");
  }

  const sortedMembers = React.useMemo(() => {
    if (!filteredMembers) return null;

    const textCmp = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base" });
    const numberCmp = (a: number, b: number) => a - b;

    const sorted = [...filteredMembers].sort((a, b) => {
      const aActive = a.isActive ?? true;
      const bActive = b.isActive ?? true;
      const aHidden = a.isHidden ?? false;
      const bHidden = b.isHidden ?? false;

      let base = 0;
      if (sortField === "member") {
        const aLabel = (a.name || a.username).trim();
        const bLabel = (b.name || b.username).trim();
        base = textCmp(aLabel, bLabel) || textCmp(a.username, b.username);
      } else if (sortField === "role") {
        base = textCmp(a.role, b.role) || textCmp(a.username, b.username);
      } else if (sortField === "status") {
        base = numberCmp(aActive ? 0 : 1, bActive ? 0 : 1) || textCmp(a.username, b.username);
      } else {
        base = numberCmp(aHidden ? 1 : 0, bHidden ? 1 : 0) || textCmp(a.username, b.username);
      }

      return sortDirection === "asc" ? base : -base;
    });

    return sorted;
  }, [filteredMembers, sortField, sortDirection]);

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
        <Typography variant="h4">Family</Typography>
        <Typography color="text.secondary">
          Manage your family members here.
        </Typography>
      </Box>

      {err && <Alert severity="error">{err}</Alert>}

      {!members && (
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress size={22} />
          <Typography>Loading members…</Typography>
        </Stack>
      )}

      {sortedMembers && (
        <Stack spacing={0.5}>
          {members && filteredMembers && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ alignSelf: "flex-end", pr: 0.5 }}
            >
              Showing {filteredMembers.length} of {members.length} members
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
                  color={memberQuery.trim() !== "" || searchOpen ? "primary" : "default"}
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
                    placeholder="Search member"
                    value={memberQuery}
                    onChange={(e) => setMemberQuery(e.target.value)}
                    sx={{ width: isMobile ? 170 : 220 }}
                    inputProps={{ "aria-label": "Search member" }}
                    InputProps={{
                      endAdornment: memberQuery ? (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            aria-label="Clear search"
                            onClick={() => setMemberQuery("")}
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
                {memberQuery.trim() !== "" && (
                  <Chip
                    size="small"
                    label={`Name: ${memberQuery.trim()}`}
                    onDelete={() => setMemberQuery("")}
                  />
                )}
                {roleFilter !== "ALL" && (
                  <Chip
                    size="small"
                    label={`Role: ${roleFilterLabel}`}
                    onDelete={() => setRoleFilter("ALL")}
                  />
                )}
                {activeFilter !== "ALL" && (
                  <Chip
                    size="small"
                    label={`Status: ${statusFilterLabel}`}
                    onDelete={() => setActiveFilter("ALL")}
                  />
                )}
                {visibilityFilter !== "ALL" && (
                  <Chip
                    size="small"
                    label={`Visibility: ${visibilityFilterLabel}`}
                    onDelete={() => setVisibilityFilter("ALL")}
                  />
                )}
              </Stack>

              <Button
                size="small"
                variant="contained"
                aria-label="Add member"
                onClick={openCreate}
                sx={{ minWidth: 34, px: 0.75, flexShrink: 0 }}
              >
                <AddRoundedIcon fontSize="small" />
              </Button>
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
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={roleFilter}
                    label="Role"
                    onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
                  >
                    <MenuItem value="ALL">All roles</MenuItem>
                    <MenuItem value="KID">Kid</MenuItem>
                    <MenuItem value="ADULT">Adult</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={activeFilter}
                    label="Status"
                    onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
                  >
                    <MenuItem value="ALL">All statuses</MenuItem>
                    <MenuItem value="ACTIVE">Active</MenuItem>
                    <MenuItem value="DEACTIVATED">Deactivated</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" fullWidth>
                  <InputLabel>Visibility</InputLabel>
                  <Select
                    value={visibilityFilter}
                    label="Visibility"
                    onChange={(e) => setVisibilityFilter(e.target.value as VisibilityFilter)}
                  >
                    <MenuItem value="ALL">All visibility</MenuItem>
                    <MenuItem value="VISIBLE">Visible</MenuItem>
                    <MenuItem value="HIDDEN">Hidden</MenuItem>
                  </Select>
                </FormControl>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Button
                    size="small"
                    onClick={() => {
                      setRoleFilter("ALL");
                      setActiveFilter("ALL");
                      setVisibilityFilter("ALL");
                      setMemberQuery("");
                    }}
                  >
                    Reset
                  </Button>
                  <Button size="small" onClick={() => setFilterAnchorEl(null)}>
                    Done
                  </Button>
                </Stack>
              </Stack>
            </Popover>

            <TableContainer sx={{ overflowX: "auto", bgcolor: "common.white" }}>
              <Table
                size="small"
                aria-label="family members table"
                sx={{
                  tableLayout: "fixed",
                  "& .MuiTableCell-root": { py: 0.5, px: 1 },
                  "& .MuiTableCell-head": { py: 0.75 },
                  "& .MuiChip-root": { height: 22, fontSize: "0.72rem" },
                }}
              >
                <TableHead sx={{ "& .MuiTableCell-head": { fontWeight: 700 } }}>
                  <TableRow>
                    <TableCell sortDirection={sortField === "member" ? sortDirection : false}>
                      <TableSortLabel
                        active={sortField === "member"}
                        direction={sortField === "member" ? sortDirection : "asc"}
                        onClick={() => onSort("member")}
                      >
                        Member
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sortDirection={sortField === "role" ? sortDirection : false} sx={{ width: 80 }}>
                      <TableSortLabel
                        active={sortField === "role"}
                        direction={sortField === "role" ? sortDirection : "asc"}
                        onClick={() => onSort("role")}
                      >
                        Role
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sortDirection={sortField === "status" ? sortDirection : false} sx={{ width: 112 }}>
                      <TableSortLabel
                        active={sortField === "status"}
                        direction={sortField === "status" ? sortDirection : "asc"}
                        onClick={() => onSort("status")}
                      >
                        Status
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sortDirection={sortField === "visibility" ? sortDirection : false} sx={{ width: 106 }}>
                      <TableSortLabel
                        active={sortField === "visibility"}
                        direction={sortField === "visibility" ? sortDirection : "asc"}
                        onClick={() => onSort("visibility")}
                      >
                        Visibility
                      </TableSortLabel>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedMembers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={tableColumnCount} align="center">
                        <Typography color="text.secondary" textAlign="center">
                          No members match the selected filters.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {sortedMembers.map((m) => {
                    const isActive = m.isActive ?? true;
                    const isHidden = m.isHidden ?? false;

                    return (
                      <TableRow
                        key={m.id}
                        hover
                        onClick={() => openEdit(m)}
                        sx={{ cursor: "pointer" }}
                      >
                        <TableCell sx={{ minWidth: isMobile ? 190 : 240 }}>
                          <Box
                            sx={{
                              display: "grid",
                              gridTemplateColumns: "30px minmax(0, 1fr)",
                              columnGap: 0.8,
                              alignItems: "center",
                            }}
                          >
                            <Avatar
                              src={m.avatarUrl || undefined}
                              sx={{
                                width: 30,
                                height: 30,
                                gridRow: "1 / span 2",
                                fontSize: "0.84rem",
                              }}
                            >
                              {(m.name || m.username || "?").trim().charAt(0).toUpperCase() || "?"}
                            </Avatar>
                            <Typography fontWeight={600} variant="body2" sx={{ minWidth: 0 }}>
                              {m.name || m.username}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                mt: 0.125,
                                minWidth: 0,
                                whiteSpace: "normal",
                                wordBreak: "break-word",
                              }}
                            >
                              {isMobile ? m.username : `${m.username} · ${m.email}`}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          <Tooltip title={m.role === "KID" ? "Kid" : "Adult"} arrow>
                            <Box
                              component="span"
                              sx={{
                                width: 22,
                                height: 22,
                                borderRadius: "999px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "text.secondary",
                                border: "1px solid rgba(120, 120, 120, 0.35)",
                                bgcolor: "rgba(120, 120, 120, 0.10)",
                              }}
                            >
                              {m.role === "KID" ? (
                                <ChildCareRoundedIcon sx={{ fontSize: 14 }} />
                              ) : (
                                <PersonRoundedIcon sx={{ fontSize: 14 }} />
                              )}
                            </Box>
                          </Tooltip>
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          <Chip
                            label={isActive ? "Active" : "Deactivated"}
                            size="small"
                            variant="outlined"
                            sx={{
                              height: 18,
                              "& .MuiChip-label": { px: 0.6, fontSize: "0.66rem" },
                              ...(isActive
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
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          <Chip
                            label={isHidden ? "Hidden" : "Visible"}
                            size="small"
                            color={isHidden ? "info" : "default"}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Stack>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Manage member" : "Add member"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Username (login)"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              fullWidth
              required
              helperText="Used for login. Must be unique."
            />

            <TextField
              label="Email (contact only)"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              fullWidth
              required
            />

            <TextField
              label="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
            />

            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
              <Avatar
                src={form.avatarUrl || undefined}
                sx={{ width: 36, height: 36 }}
              >
                {(form.name || form.username || "?").trim().charAt(0).toUpperCase() || "?"}
              </Avatar>
              <Button component="label" size="small" variant="outlined">
                Choose picture
                <input hidden type="file" accept="image/*" onChange={onAvatarFileSelected} />
              </Button>
              {form.avatarUrl && (
                <Button
                  size="small"
                  color="inherit"
                  onClick={() => setForm((f) => ({ ...f, avatarUrl: "" }))}
                >
                  Remove picture
                </Button>
              )}
              <Typography variant="caption" color="text.secondary">
                Optional, up to 1.5MB.
              </Typography>
            </Stack>

            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select value={form.role} label="Role" onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as any }))}>
                <MenuItem value="KID">Kid</MenuItem>
                <MenuItem value="ADULT">Adult</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label={editing ? "Reset password (optional)" : "Password"}
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              fullWidth
              required={!editing}
              helperText={editing ? "Leave blank to keep current password." : "Minimum 6 characters."}
            />

            {editing && (
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Switch
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        isActive: e.target.checked,
                        isHidden: e.target.checked ? false : f.isHidden,
                      }))
                    }
                  />
                  <Typography>{form.isActive ? "Active" : "Deactivated"}</Typography>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center">
                  <Switch
                    checked={form.isHidden}
                    disabled={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isHidden: e.target.checked }))}
                  />
                  <Typography color={form.isActive ? "text.secondary" : "text.primary"}>
                    Hidden (only allowed when deactivated)
                  </Typography>
                </Stack>
              </Stack>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
