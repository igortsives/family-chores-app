"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";

import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import ChecklistRoundedIcon from "@mui/icons-material/ChecklistRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import LeaderboardRoundedIcon from "@mui/icons-material/LeaderboardRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  show?: boolean;
};

export default function BrandShell({
  children,
  role,
  username,
}: {
  children: React.ReactNode;
  role?: "ADULT" | "KID";
  username?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const nav: NavItem[] = [
    { label: "My chores", href: "/app/my-chores", icon: <ChecklistRoundedIcon /> },
    { label: "Awards", href: "/app/awards", icon: <EmojiEventsRoundedIcon /> },
    { label: "Leaderboard", href: "/app/leaderboard", icon: <LeaderboardRoundedIcon /> },
    { label: "Admin", href: "/app/admin/chores", icon: <AdminPanelSettingsRoundedIcon />, show: role === "ADULT" },
    { label: "Approvals", href: "/app/admin/approvals", icon: <FactCheckRoundedIcon />, show: role === "ADULT" },
    { label: "Star exchanges", href: "/app/admin/stars", icon: <AutoAwesomeRoundedIcon />, show: role === "ADULT" },
    { label: "Family", href: "/app/admin/family", icon: <GroupRoundedIcon />, show: role === "ADULT" },
  ].filter((x) => x.show !== false);

  function go(href: string) {
    router.push(href);
    setOpen(false);
  }

  const DrawerContent = (
    <Box sx={{ width: 280, p: 2 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ pb: 1 }}>
        <Avatar sx={{ bgcolor: "primary.main", width: 40, height: 40 }}>
          <ChecklistRoundedIcon />
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 900, lineHeight: 1.1 }}>Family Chores</Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {username ? `@${username}` : "Signed in"}
          </Typography>
        </Box>
      </Stack>

      <Divider sx={{ my: 1.5 }} />

      <List disablePadding>
        {nav.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <ListItemButton
              key={item.href}
              selected={active}
              onClick={() => go(item.href)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                "&.Mui-selected": {
                  bgcolor: "rgba(25,118,210,0.10)",
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ mt: 2 }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<LogoutRoundedIcon />}
          onClick={async () => { await signOut({ redirect: false }); window.location.assign('/login'); }}
          sx={{ borderRadius: 2 }}
        >
          Log out
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "radial-gradient(1100px circle at 15% 10%, rgba(25,118,210,0.10), transparent 55%), radial-gradient(900px circle at 85% 15%, rgba(156,39,176,0.08), transparent 45%), linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.00))",
      }}
    >
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          backgroundColor: "rgba(255,255,255,0.70)",
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <IconButton edge="start" onClick={() => setOpen(true)} aria-label="menu">
            <MenuRoundedIcon />
          </IconButton>

          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ flexGrow: 1, minWidth: 0 }}>
            <Avatar sx={{ bgcolor: "primary.main", width: 34, height: 34 }}>
              <ChecklistRoundedIcon fontSize="small" />
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 900, lineHeight: 1.1 }} noWrap>
                Family Chores
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {role === "ADULT" ? "Parent mode" : "Kid mode"}
                {username ? ` • @${username}` : ""}
              </Typography>
            </Box>
          </Stack>
        </Toolbar>
      </AppBar>

      <Drawer open={open} onClose={() => setOpen(false)} anchor="left">
        {DrawerContent}
      </Drawer>

      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 } }}>
        {/* slightly elevated content feel */}
        <Box sx={{ p: { xs: 0, sm: 1 } }}>{children}</Box>
      </Container>
    </Box>
  );
}
