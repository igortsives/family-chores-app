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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";

type Member = {
  id: string;
  username: string;
  email: string;
  name: string | null;
  role: "ADULT" | "KID";
  isActive?: boolean;
  isHidden?: boolean;
};

export default function FamilyMembersPage() {
  const { data: session, status } = useSession();
  const role = (session?.user as any)?.role as "ADULT" | "KID" | undefined;

  const [members, setMembers] = React.useState<Member[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Member | null>(null);

  const [form, setForm] = React.useState({
    username: "",
    email: "",
    name: "",
    role: "KID" as "KID" | "ADULT",
    password: "",
    isActive: true,
    isHidden: false,
  });

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
    setForm({ username: "", email: "", name: "", role: "KID", password: "", isActive: true, isHidden: false });
    setOpen(true);
  }

  function openEdit(m: Member) {
    setEditing(m);
    setForm({
      username: m.username ?? "",
      email: m.email ?? "",
      name: m.name ?? "",
      role: m.role,
      password: "",
      isActive: m.isActive ?? true,
      isHidden: m.isHidden ?? false,
    });
    setOpen(true);
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
        <Typography variant="h4">Family members</Typography>
        <Typography color="text.secondary">
          Login uses <b>username</b>. Email is collected for contact only. Members cannot be deleted.
        </Typography>
      </Box>

      {err && <Alert severity="error">{err}</Alert>}

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Members</Typography>
        <Button variant="contained" onClick={openCreate}>
          Add member
        </Button>
      </Stack>

      {!members && (
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress size={22} />
          <Typography>Loading members…</Typography>
        </Stack>
      )}

      {members?.map((m) => (
        <Card key={m.id} variant="outlined">
          <CardContent>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
              gap={2}
            >
              <Box>
                <Typography variant="h6">{m.name || m.username}</Typography>
                <Typography color="text.secondary">
                  Username: <b>{m.username}</b> · Email: {m.email}
                </Typography>

                <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                  <Chip label={m.role} size="small" />
                  {typeof m.isActive === "boolean" && (
                    <Chip
                      label={m.isActive ? "Active" : "Deactivated"}
                      size="small"
                      color={m.isActive ? "success" : "default"}
                    />
                  )}
                  {m.isActive === false && m.isHidden && <Chip label="Hidden" size="small" color="info" />}
                </Stack>
              </Box>

              <Button variant="outlined" onClick={() => openEdit(m)}>
                Manage
              </Button>
            </Stack>
          </CardContent>
        </Card>
      ))}

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
