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
  Tooltip,
  useMediaQuery,
  TextField,
  Typography,
} from "@mui/material";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ChildCareRoundedIcon from "@mui/icons-material/ChildCareRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";

type Member = {
  id: string;
  username: string;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
  lastLoginAt?: string | null;
  role: "ADULT" | "KID";
  isActive?: boolean;
  isHidden?: boolean;
};

type RoleFilter = "ALL" | "ADULT" | "KID";
type ActiveFilter = "ALL" | "ACTIVE" | "INACTIVE";
type VisibilityFilter = "ALL" | "VISIBLE" | "HIDDEN";

const ROLE_CHIP_OPTIONS: Array<{ value: RoleFilter; label: string }> = [
  { value: "ALL", label: "All roles" },
  { value: "KID", label: "Kid" },
  { value: "ADULT", label: "Adult" },
];

const STATUS_CHIP_OPTIONS: Array<{ value: ActiveFilter; label: string }> = [
  { value: "ALL", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

const VISIBILITY_CHIP_OPTIONS: Array<{ value: VisibilityFilter; label: string }> = [
  { value: "ALL", label: "All visibility" },
  { value: "VISIBLE", label: "Visible" },
  { value: "HIDDEN", label: "Hidden" },
];

export default function FamilyMembersPage() {
  const { data: session, status } = useSession();
  const role = (session?.user as any)?.role as "ADULT" | "KID" | undefined;
  const isMobile = useMediaQuery("(max-width:600px)");

  const [members, setMembers] = React.useState<Member[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [roleFilter, setRoleFilter] = React.useState<RoleFilter>("ALL");
  const [activeFilter, setActiveFilter] = React.useState<ActiveFilter>("ALL");
  const [visibilityFilter, setVisibilityFilter] = React.useState<VisibilityFilter>("ALL");
  const [memberQuery, setMemberQuery] = React.useState("");
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
  const lastLoginFormatter = React.useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    [],
  );
  const formatLastLogin = React.useCallback(
    (value?: string | null) => {
      if (!value) return "Never";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "Never";
      const now = new Date();
      const diffMs = Math.max(0, now.getTime() - date.getTime());
      const seconds = Math.floor(diffMs / 1000);
      if (seconds < 60) return `${Math.max(1, seconds)} second${seconds === 1 ? "" : "s"} ago`;

      const minutes = Math.floor(diffMs / 60_000);
      if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
      if (minutes < 120) return "an hour ago";
      if (minutes < 6 * 60) return "a few hours ago";

      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfLoginDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayDiff = Math.round((startOfToday.getTime() - startOfLoginDay.getTime()) / 86_400_000);
      if (dayDiff === 0) return "today";
      if (dayDiff === 1) return "yesterday";

      return lastLoginFormatter.format(date);
    },
    [lastLoginFormatter],
  );

  const sortedMembers = React.useMemo(() => {
    if (!filteredMembers) return null;

    return [...filteredMembers].sort((a, b) => {
      const aLabel = (a.name || a.username).trim();
      const bLabel = (b.name || b.username).trim();
      return (
        aLabel.localeCompare(bLabel, undefined, { sensitivity: "base" })
        || a.username.localeCompare(b.username, undefined, { sensitivity: "base" })
      );
    });
  }, [filteredMembers]);

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
                    maxWidth: searchOpen ? "min(240px, 72vw)" : 0,
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
                    sx={{ width: { xs: 170, sm: 220 } }}
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

              <Tooltip title="Add member" disableHoverListener={!isMobile}>
                <Button
                  size="small"
                  variant="contained"
                  aria-label="Add member"
                  onClick={openCreate}
                  startIcon={isMobile ? undefined : <AddRoundedIcon fontSize="small" />}
                  sx={{
                    minWidth: isMobile ? 34 : "auto",
                    px: isMobile ? 0.75 : 1.2,
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  {isMobile ? <AddRoundedIcon fontSize="small" /> : "Add member"}
                </Button>
              </Tooltip>
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
                    <MenuItem value="INACTIVE">Inactive</MenuItem>
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

            <Stack sx={{ bgcolor: "common.white" }}>
              {sortedMembers.length === 0 && (
                <Box sx={{ px: 2, py: 3 }}>
                  <Typography color="text.secondary" textAlign="center">
                    No members match the selected filters.
                  </Typography>
                </Box>
              )}
              {sortedMembers.map((m, idx) => {
                const isActive = m.isActive ?? true;
                const isHidden = m.isHidden ?? false;
                const isInactive = !isActive;

                return (
                  <Box
                    key={m.id}
                    data-testid={`family-member-${m.id}`}
                    onClick={() => openEdit(m)}
                    sx={{
                      px: 1.25,
                      py: 0.75,
                      cursor: "pointer",
                      borderTop: idx === 0 ? "none" : "1px solid",
                      borderColor: "divider",
                      transition: "background-color 140ms ease",
                      bgcolor: isInactive ? "rgba(120, 120, 120, 0.05)" : undefined,
                      opacity: isInactive ? 0.82 : 1,
                      "&:hover": { bgcolor: isInactive ? "rgba(120, 120, 120, 0.1)" : "action.hover", opacity: 1 },
                    }}
                  >
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "44px minmax(0, 1fr)",
                        columnGap: 0.9,
                        alignItems: "center",
                      }}
                    >
                      <Avatar
                        className="member-avatar"
                        src={m.avatarUrl || undefined}
                        sx={{
                          width: 44,
                          height: 44,
                          fontSize: "0.96rem",
                          filter: isInactive ? "grayscale(0.25)" : "none",
                        }}
                      >
                        {(m.name || m.username || "?").trim().charAt(0).toUpperCase() || "?"}
                      </Avatar>

                      <Stack spacing={0}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ minWidth: 0, gap: 0.6 }}>
                          <Stack direction="row" spacing={0.45} alignItems="center" sx={{ minWidth: 0 }}>
                            <Typography fontWeight={600} variant="body2" sx={{ minWidth: 0 }}>
                              {m.name || m.username}
                            </Typography>
                            <Tooltip title={m.role === "KID" ? "Kid" : "Adult"} arrow>
                              <Box
                                component="span"
                                sx={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: "999px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "text.secondary",
                                  border: "1px solid rgba(120, 120, 120, 0.35)",
                                  bgcolor: "rgba(120, 120, 120, 0.10)",
                                  flexShrink: 0,
                                }}
                              >
                                {m.role === "KID" ? (
                                  <ChildCareRoundedIcon sx={{ fontSize: 11 }} />
                                ) : (
                                  <PersonRoundedIcon sx={{ fontSize: 11 }} />
                                  )}
                              </Box>
                            </Tooltip>
                            <Tooltip title={isHidden ? "Hidden from family" : "Visible to family"} arrow>
                              <Box
                                component="span"
                                sx={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: "999px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: isHidden ? "text.secondary" : "info.main",
                                  border: "1px solid rgba(120, 120, 120, 0.35)",
                                  bgcolor: "rgba(120, 120, 120, 0.08)",
                                  flexShrink: 0,
                                }}
                              >
                                {isHidden ? (
                                  <VisibilityOffRoundedIcon sx={{ fontSize: 11 }} />
                                ) : (
                                  <VisibilityRoundedIcon sx={{ fontSize: 11 }} />
                                )}
                              </Box>
                            </Tooltip>
                          </Stack>
                          <Chip
                            size="small"
                            variant="outlined"
                            label={isActive ? "Active" : "Inactive"}
                            sx={{
                              height: 18,
                              width: 86,
                              flexShrink: 0,
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
                        </Stack>

                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            mt: 0.1,
                            minWidth: 0,
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                          }}
                        >
                          {`${m.username} · ${m.email}`}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            mt: 0.05,
                            minWidth: 0,
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                            color: "text.disabled",
                            fontStyle: "italic",
                          }}
                        >
                          Last login: {formatLastLogin(m.lastLoginAt)}
                        </Typography>
                      </Stack>
                    </Box>
                  </Box>
                );
              })}
            </Stack>
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
                  <Typography>{form.isActive ? "Active" : "Inactive"}</Typography>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center">
                  <Switch
                    checked={form.isHidden}
                    disabled={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isHidden: e.target.checked }))}
                  />
                  <Typography color={form.isActive ? "text.secondary" : "text.primary"}>
                    Hidden (only allowed when inactive)
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
