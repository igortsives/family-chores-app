"use client";

import * as React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import AssignmentRoundedIcon from "@mui/icons-material/AssignmentRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";

type SessionUser = {
  role?: "ADULT" | "KID";
  name?: string | null;
  username?: string | null;
  email?: string | null;
  image?: string | null;
  avatarUrl?: string | null;
};

type MeProfile = {
  role: "ADULT" | "KID";
  name: string | null;
  username: string;
  email: string | null;
  avatarUrl: string | null;
};

const ADMIN_SETTINGS_LINKS = [
  {
    title: "Chores",
    description: "Create chores, assign kids, and manage active schedules.",
    href: "/app/admin/chores",
    icon: <AssignmentRoundedIcon color="primary" />,
  },
  {
    title: "Family members",
    description: "Manage members, roles, activation, visibility, and profile avatars.",
    href: "/app/admin/family",
    icon: <GroupRoundedIcon color="primary" />,
  },
] as const;

function combineHandleAndEmail(username: string | null, email: string) {
  if (username && username.trim().length > 0) {
    return `@${username} · ${email}`;
  }
  return email;
}

export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const user = session?.user as SessionUser | undefined;
  const [profile, setProfile] = React.useState<MeProfile | null>(null);

  React.useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    const abort = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store", signal: abort.signal });
        if (!res.ok) {
          return;
        }
        const data = (await res.json()) as { me?: MeProfile };
        if (data?.me) {
          setProfile(data.me);
        }
      } catch {
        // Keep session-derived profile fallback.
      }
    })();

    return () => abort.abort();
  }, [status]);

  const role = profile?.role ?? user?.role;
  const displayName = (profile?.name?.trim() || user?.name?.trim()) || "Parent";
  const displayUsername = profile?.username?.trim() || user?.username?.trim() || null;
  const displayEmail = (profile?.email?.trim() || user?.email?.trim()) || "No email";
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const avatarImage = (profile?.avatarUrl && profile.avatarUrl.trim().length > 0
    ? profile.avatarUrl
    : user?.avatarUrl && user.avatarUrl.trim().length > 0
      ? user.avatarUrl
      : user?.image && user.image.trim().length > 0
        ? user.image
        : undefined);

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
        <Typography variant="h4">Settings</Typography>
        <Typography color="text.secondary">
          Parent admin controls for managing chores and family members.
        </Typography>
      </Box>

      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar src={avatarImage} sx={{ width: 48, height: 48 }}>
              {avatarLetter}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
                {displayName}
              </Typography>
              <Typography color="text.secondary" noWrap>
                {combineHandleAndEmail(displayUsername, displayEmail)}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Box>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Manage
        </Typography>
      </Box>

      <Stack direction="column" spacing={1.5}>
        {ADMIN_SETTINGS_LINKS.map((item) => (
          <Card key={item.href} variant="outlined">
            <CardActionArea component={Link} href={item.href} sx={{ height: "100%" }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                  {item.icon}
                  <Typography variant="h6" sx={{ lineHeight: 1.2 }}>{item.title}</Typography>
                </Stack>
                <Typography color="text.secondary">{item.description}</Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}
