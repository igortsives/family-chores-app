"use client";

import * as React from "react";
import {
  Stack, Typography, Tabs, Tab, Button, Card, CardContent, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, FormControlLabel, Switch, Alert, Checkbox, FormGroup
} from "@mui/material";

type Role = "ADULT" | "KID";

type User = { id: string; email: string; name?: string | null; role: Role };
type Award = { id: string; name: string; icon?: string | null; thresholdPoints: number };
type Schedule = { id: string; frequency: "DAILY" | "WEEKLY"; dayOfWeek?: number | null; timeOfDay?: string | null };
type Assignment = { id: string; userId: string; user: User };
type Chore = {
  id: string; title: string; description?: string | null; points: number; active: boolean;
  schedules: Schedule[]; assignments: Assignment[];
};

function dayLabel(d?: number | null) {
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  if (d == null) return "";
  return days[d] ?? "";
}

export default function ConfigClient() {
  const [tab, setTab] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const [users, setUsers] = React.useState<User[]>([]);
  const [awards, setAwards] = React.useState<Award[]>([]);
  const [chores, setChores] = React.useState<Chore[]>([]);

  const refresh = React.useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/config/overview");
      if (!res.ok) throw new Error("Failed to load config");
      const data = await res.json();
      setUsers(data.users);
      setAwards(data.awards);
      setChores(data.chores);
    } catch (e: any) {
      setErr(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { refresh(); }, [refresh]);

  // --- Dialog state: Chore ---
  const [choreOpen, setChoreOpen] = React.useState(false);
  const [editingChore, setEditingChore] = React.useState<Chore | null>(null);

  const [chTitle, setChTitle] = React.useState("");
  const [chDesc, setChDesc] = React.useState("");
  const [chPoints, setChPoints] = React.useState(1);
  const [chActive, setChActive] = React.useState(true);
  const [chFreq, setChFreq] = React.useState<"DAILY" | "WEEKLY">("DAILY");
  const [chDay, setChDay] = React.useState<number>(1);
  const [chTime, setChTime] = React.useState("");
  const [chAssigned, setChAssigned] = React.useState<Record<string, boolean>>({});

  const openCreateChore = () => {
    setEditingChore(null);
    setChTitle("");
    setChDesc("");
    setChPoints(1);
    setChActive(true);
    setChFreq("DAILY");
    setChDay(1);
    setChTime("");
    setChAssigned(Object.fromEntries(users.map(u => [u.id, u.role === "KID"])));
    setChoreOpen(true);
  };

  const openEditChore = (c: Chore) => {
    setEditingChore(c);
    setChTitle(c.title);
    setChDesc(c.description ?? "");
    setChPoints(c.points);
    setChActive(c.active);
    const s = c.schedules[0];
    setChFreq((s?.frequency ?? "DAILY") as any);
    setChDay((s?.dayOfWeek ?? 1) as number);
    setChTime((s?.timeOfDay ?? "") as string);
    const assigned = new Set(c.assignments.map(a => a.userId));
    setChAssigned(Object.fromEntries(users.map(u => [u.id, assigned.has(u.id)])));
    setChoreOpen(true);
  };

  const saveChore = async () => {
    setErr(null);
    const assignedUserIds = Object.entries(chAssigned).filter(([,v]) => v).map(([k]) => k);
    const payload = {
      title: chTitle,
      description: chDesc || undefined,
      points: Number(chPoints),
      active: Boolean(chActive),
      schedule: {
        frequency: chFreq,
        dayOfWeek: chFreq === "WEEKLY" ? Number(chDay) : undefined,
        timeOfDay: chTime || undefined,
      },
      assignedUserIds,
    };

    const isEdit = Boolean(editingChore);
    const url = isEdit ? `/api/chores/${editingChore!.id}` : "/api/chores";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Failed to save chore");
      return;
    }
    setChoreOpen(false);
    await refresh();
  };

  const deleteChore = async (id: string) => {
    if (!confirm("Delete this chore?")) return;
    const res = await fetch(`/api/chores/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Failed to delete chore");
      return;
    }
    await refresh();
  };

  // --- Dialog state: Award ---
  const [awardOpen, setAwardOpen] = React.useState(false);
  const [editingAward, setEditingAward] = React.useState<Award | null>(null);
  const [aName, setAName] = React.useState("");
  const [aIcon, setAIcon] = React.useState("");
  const [aThresh, setAThresh] = React.useState(0);

  const openCreateAward = () => {
    setEditingAward(null);
    setAName("");
    setAIcon("🏅");
    setAThresh(0);
    setAwardOpen(true);
  };

  const openEditAward = (a: Award) => {
    setEditingAward(a);
    setAName(a.name);
    setAIcon(a.icon ?? "");
    setAThresh(a.thresholdPoints);
    setAwardOpen(true);
  };

  const saveAward = async () => {
    setErr(null);
    if (!aName.trim()) return setErr("Award name required");
    const payload = { name: aName.trim(), icon: aIcon || undefined, thresholdPoints: Number(aThresh) };

    const isEdit = Boolean(editingAward);
    const url = isEdit ? `/api/awards/${editingAward!.id}` : "/api/awards";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Failed to save award");
      return;
    }
    setAwardOpen(false);
    await refresh();
  };

  const deleteAward = async (id: string) => {
    if (!confirm("Delete this award?")) return;
    const res = await fetch(`/api/awards/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Failed to delete award");
      return;
    }
    await refresh();
  };

  // --- Dialog state: User create ---
  const [userOpen, setUserOpen] = React.useState(false);
  const [uEmail, setUEmail] = React.useState("");
  const [uName, setUName] = React.useState("");
  const [uRole, setURole] = React.useState<Role>("KID");
  const [uPass, setUPass] = React.useState("");

  const openCreateUser = () => {
    setUEmail("");
    setUName("");
    setURole("KID");
    setUPass("");
    setUserOpen(true);
  };

  const saveUser = async () => {
    setErr(null);
    const payload = { email: uEmail.trim(), name: uName.trim() || undefined, role: uRole, password: uPass };
    const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Failed to create user");
      return;
    }
    setUserOpen(false);
    await refresh();
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Configure</Typography>
      <Typography color="text.secondary">Manage chores, schedules, assignments, awards, and family members.</Typography>

      {err && <Alert severity="error">{err}</Alert>}
      {loading && <Typography color="text.secondary">Loading…</Typography>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label="Chores" />
        <Tab label="Awards" />
        <Tab label="Family Members" />
      </Tabs>

      {tab === 0 && (
        <Stack spacing={2}>
          <Button variant="contained" onClick={openCreateChore}>Add chore</Button>

          {chores.map(c => {
            const s = c.schedules[0];
            const scheduleText = s ? (s.frequency === "DAILY" ? "Daily" : `Weekly (${dayLabel(s.dayOfWeek)})`) : "No schedule";
            const assignedNames = c.assignments.map(a => a.user.name ?? a.user.email).join(", ") || "Nobody";
            return (
              <Card key={c.id}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                    <div>
                      <Typography variant="h6">{c.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {c.description || ""} {c.description ? "• " : ""}{scheduleText} • Assigned: {assignedNames}
                      </Typography>
                    </div>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip label={`${c.points} pts`} />
                      {!c.active && <Chip color="warning" label="Inactive" />}
                      <Button variant="outlined" onClick={() => openEditChore(c)}>Edit</Button>
                      <Button color="error" onClick={() => deleteChore(c.id)}>Delete</Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      {tab === 1 && (
        <Stack spacing={2}>
          <Button variant="contained" onClick={openCreateAward}>Add award</Button>

          {awards.map(a => (
            <Card key={a.id}>
              <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
                <div>
                  <Typography variant="h6">{a.icon ?? "🏅"} {a.name}</Typography>
                  <Typography variant="body2" color="text.secondary">Threshold: {a.thresholdPoints} points</Typography>
                </div>
                <Stack direction="row" spacing={1}>
                  <Button variant="outlined" onClick={() => openEditAward(a)}>Edit</Button>
                  <Button color="error" onClick={() => deleteAward(a.id)}>Delete</Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {tab === 2 && (
        <Stack spacing={2}>
          <Button variant="contained" onClick={openCreateUser}>Add family member</Button>

          {users.map(u => (
            <Card key={u.id}>
              <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
                <div>
                  <Typography variant="h6">{u.name ?? u.email}</Typography>
                  <Typography variant="body2" color="text.secondary">{u.email} • {u.role}</Typography>
                </div>
                <Chip label={u.role} />
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Chore dialog */}
      <Dialog open={choreOpen} onClose={() => setChoreOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingChore ? "Edit chore" : "Add chore"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Title" value={chTitle} onChange={(e) => setChTitle(e.target.value)} />
            <TextField label="Description" value={chDesc} onChange={(e) => setChDesc(e.target.value)} />
            <TextField label="Points" type="number" value={chPoints} onChange={(e) => setChPoints(Number(e.target.value))} />
            <FormControlLabel control={<Switch checked={chActive} onChange={(e) => setChActive(e.target.checked)} />} label="Active" />

            <TextField select label="Schedule Frequency" value={chFreq} onChange={(e) => setChFreq(e.target.value as any)}>
              <MenuItem value="DAILY">Daily</MenuItem>
              <MenuItem value="WEEKLY">Weekly</MenuItem>
            </TextField>

            {chFreq === "WEEKLY" && (
              <TextField select label="Day of week" value={chDay} onChange={(e) => setChDay(Number(e.target.value))}>
                <MenuItem value={0}>Sunday</MenuItem>
                <MenuItem value={1}>Monday</MenuItem>
                <MenuItem value={2}>Tuesday</MenuItem>
                <MenuItem value={3}>Wednesday</MenuItem>
                <MenuItem value={4}>Thursday</MenuItem>
                <MenuItem value={5}>Friday</MenuItem>
                <MenuItem value={6}>Saturday</MenuItem>
              </TextField>
            )}

            <TextField label="Time (optional, e.g. 18:00)" value={chTime} onChange={(e) => setChTime(e.target.value)} />

            <Typography variant="subtitle2">Assign to</Typography>
            <FormGroup>
              {users.map(u => (
                <FormControlLabel
                  key={u.id}
                  control={
                    <Checkbox
                      checked={Boolean(chAssigned[u.id])}
                      onChange={(e) => setChAssigned(prev => ({ ...prev, [u.id]: e.target.checked }))}
                    />
                  }
                  label={`${u.name ?? u.email} (${u.role})`}
                />
              ))}
            </FormGroup>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChoreOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveChore}>{editingChore ? "Save" : "Create"}</Button>
        </DialogActions>
      </Dialog>

      {/* Award dialog */}
      <Dialog open={awardOpen} onClose={() => setAwardOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingAward ? "Edit award" : "Add award"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" value={aName} onChange={(e) => setAName(e.target.value)} />
            <TextField label="Icon (emoji optional)" value={aIcon} onChange={(e) => setAIcon(e.target.value)} />
            <TextField label="Threshold points" type="number" value={aThresh} onChange={(e) => setAThresh(Number(e.target.value))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAwardOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveAward}>{editingAward ? "Save" : "Create"}</Button>
        </DialogActions>
      </Dialog>

      {/* User dialog */}
      <Dialog open={userOpen} onClose={() => setUserOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add family member</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Email" value={uEmail} onChange={(e) => setUEmail(e.target.value)} />
            <TextField label="Name" value={uName} onChange={(e) => setUName(e.target.value)} />
            <TextField select label="Role" value={uRole} onChange={(e) => setURole(e.target.value as any)}>
              <MenuItem value="KID">Kid</MenuItem>
              <MenuItem value="ADULT">Adult</MenuItem>
            </TextField>
            <TextField label="Password" type="password" value={uPass} onChange={(e) => setUPass(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveUser}>Create</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
