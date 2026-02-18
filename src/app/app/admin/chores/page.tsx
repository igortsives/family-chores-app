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
  OutlinedInput,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";

type Kid = { id: string; name: string | null; email: string };
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

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AdminChoresPage() {
  const { data: session, status } = useSession();
  const role = (session?.user as any)?.role as "ADULT" | "KID" | undefined;

  const [kids, setKids] = React.useState<Kid[]>([]);
  const [chores, setChores] = React.useState<ChoreRow[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

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
        <Typography variant="h4">Parent admin</Typography>
        <Typography color="text.secondary">Create chores, assign kids, and schedule weekly.</Typography>
      </Box>

      {err && <Alert severity="error">{err}</Alert>}

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Chores</Typography>
        <Button variant="contained" onClick={openCreate}>
          New chore
        </Button>
      </Stack>

      {!chores && (
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress size={22} />
          <Typography>Loading chores…</Typography>
        </Stack>
      )}

      {chores?.map((c) => (
        <Card key={c.id} variant="outlined">
          <CardContent>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
                <Box>
                  <Typography variant="h6">{c.title}</Typography>
                  {c.description && <Typography color="text.secondary">{c.description}</Typography>}
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center">
                    <Chip label={`${c.points} pts`} size="small" />
                    <Chip label={c.active ? "Active" : "Inactive"} size="small" />
                    <Chip
                      label={
                        c.schedule.frequency === "WEEKLY"
                          ? `Weekly: ${DAYS[c.schedule.dayOfWeek ?? 0]}`
                          : "Daily"
                      }
                      size="small"
                      color="info"
                    />
                    <Chip label={`Assigned: ${c.assignedKidIds.length}`} size="small" />
                  </Stack>
                </Box>

                <Stack
  direction={{ xs: "column", sm: "row" }}
  spacing={1}
  sx={{ minWidth: { sm: 180 }, width: { xs: "100%", sm: "auto" } }}
>
  <Button
    fullWidth
    variant="outlined"
    onClick={() => openEdit(c)}
    sx={{ whiteSpace: "nowrap" }}
  >
    Edit
  </Button>
  <Button
    fullWidth
    color="error"
    variant="outlined"
    onClick={() => remove(c.id)}
    sx={{ whiteSpace: "nowrap" }}
  >
    Delete
  </Button>
</Stack>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      ))}

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
                  const names = kids
                    .filter((k) => selected.includes(k.id))
                    .map((k) => k.name || k.email);
                  return names.join(", ");
                }}
              >
                {kids.map((k) => (
                  <MenuItem key={k.id} value={k.id}>
                    {k.name || k.email}
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
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => save()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
