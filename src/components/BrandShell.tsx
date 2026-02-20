"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Tooltip,
  useMediaQuery,
  Typography,
} from "@mui/material";

import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import ChecklistRoundedIcon from "@mui/icons-material/ChecklistRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import LeaderboardRoundedIcon from "@mui/icons-material/LeaderboardRounded";
import AssignmentRoundedIcon from "@mui/icons-material/AssignmentRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import QueryStatsRoundedIcon from "@mui/icons-material/QueryStatsRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import GradeRoundedIcon from "@mui/icons-material/GradeRounded";
import TokenRoundedIcon from "@mui/icons-material/TokenRounded";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  show?: boolean;
};

type NotificationItem = {
  id: string;
  kind: "REMINDER" | "UPDATE";
  severity: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
  title: string;
  message: string;
  href: string;
  createdAt: string;
  readAt: string | null;
};

type KidSummary = {
  weeklyPoints: number;
  totalStarsEarned: number;
  avatarUrl: string | null;
};

export default function BrandShell({
  children,
  role,
  username,
  name,
}: {
  children: React.ReactNode;
  role?: "ADULT" | "KID";
  username?: string;
  name?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isKidView = role === "KID";
  const isMobile = useMediaQuery("(max-width:600px)");
  const isKidMobile = isKidView && isMobile;
  const [open, setOpen] = React.useState(false);
  const [kidMenuAnchorEl, setKidMenuAnchorEl] = React.useState<HTMLElement | null>(null);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [notifLoading, setNotifLoading] = React.useState(false);
  const [notifErr, setNotifErr] = React.useState<string | null>(null);
  const [notifItems, setNotifItems] = React.useState<NotificationItem[]>([]);
  const [notifUnreadCount, setNotifUnreadCount] = React.useState(0);
  const [kidSummary, setKidSummary] = React.useState<KidSummary | null>(null);

  const nav: NavItem[] = [
    { label: isKidView ? "Today's chores" : "My chores", href: "/app/my-chores", icon: <ChecklistRoundedIcon /> },
    { label: isKidView ? "Stars & rewards" : "Awards", href: "/app/awards", icon: <EmojiEventsRoundedIcon /> },
    { label: isKidView ? "Scoreboard" : "Leaderboard", href: "/app/leaderboard", icon: <LeaderboardRoundedIcon />, show: !isKidView },
    { label: "Chores", href: "/app/admin/chores", icon: <AssignmentRoundedIcon />, show: role === "ADULT" },
    { label: "Approvals", href: "/app/admin/approvals", icon: <FactCheckRoundedIcon />, show: role === "ADULT" },
    { label: "Star exchanges", href: "/app/admin/stars", icon: <AutoAwesomeRoundedIcon />, show: role === "ADULT" },
    { label: "Family stats", href: "/app/admin/stats", icon: <QueryStatsRoundedIcon />, show: role === "ADULT" },
    { label: "Family", href: "/app/admin/family", icon: <GroupRoundedIcon />, show: role === "ADULT" },
  ].filter((x) => x.show !== false);
  const kidMenuNav = React.useMemo(
    () => nav.filter((item) => item.href === "/app/my-chores" || item.href === "/app/awards"),
    [nav],
  );

  function go(href: string) {
    router.push(href);
    setOpen(false);
  }

  function goKidMenu(href: string) {
    router.push(href);
    setKidMenuAnchorEl(null);
  }

  const loadNotifications = React.useCallback(async () => {
    setNotifErr(null);
    setNotifLoading(true);
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof j?.error === "string" ? j.error : `Failed (${res.status})`;
        throw new Error(msg);
      }
      const items = Array.isArray(j?.items) ? (j.items as NotificationItem[]) : [];
      const unreadCount = typeof j?.unreadCount === "number" ? j.unreadCount : 0;
      setNotifItems(items);
      setNotifUnreadCount(unreadCount);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setNotifErr(message);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadNotifications();
    const timer = window.setInterval(() => {
      void loadNotifications();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [loadNotifications]);

  const loadKidSummary = React.useCallback(async () => {
    if (!isKidView) return;
    try {
      const res = await fetch("/api/kid-summary", { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) return;
      const weeklyPoints = typeof j?.weeklyPoints === "number" ? j.weeklyPoints : 0;
      const totalStarsEarned = typeof j?.totalStarsEarned === "number" ? j.totalStarsEarned : 0;
      const avatarUrl = typeof j?.avatarUrl === "string" && j.avatarUrl.trim().length > 0 ? j.avatarUrl : null;
      setKidSummary({ weeklyPoints, totalStarsEarned, avatarUrl });
    } catch {
      // Keep nav resilient even if summary lookup fails.
    }
  }, [isKidView]);

  React.useEffect(() => {
    if (!isKidView) {
      setKidSummary(null);
      return;
    }
    void loadKidSummary();
    const timer = window.setInterval(() => {
      void loadKidSummary();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [isKidView, loadKidSummary]);

  function notificationColor(severity: NotificationItem["severity"]) {
    if (severity === "SUCCESS") return "success" as const;
    if (severity === "WARNING") return "warning" as const;
    if (severity === "ERROR") return "error" as const;
    return "info" as const;
  }

  function openNotifications() {
    setNotifOpen(true);
    void loadNotifications();
  }

  async function markNotificationRead(id: string) {
    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "READ", id }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = typeof j?.error === "string" ? j.error : `Failed (${res.status})`;
      throw new Error(msg);
    }
    const unreadCount = typeof j?.unreadCount === "number" ? j.unreadCount : 0;
    setNotifUnreadCount(unreadCount);
    setNotifItems((prev) =>
      prev.map((item) =>
        item.id === id && item.readAt === null ? { ...item, readAt: new Date().toISOString() } : item
      )
    );
  }

  async function dismissNotificationItem(id: string) {
    const res = await fetch("/api/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = typeof j?.error === "string" ? j.error : `Failed (${res.status})`;
      throw new Error(msg);
    }
    const unreadCount = typeof j?.unreadCount === "number" ? j.unreadCount : 0;
    setNotifUnreadCount(unreadCount);
    setNotifItems((prev) => prev.filter((item) => item.id !== id));
  }

  async function markAllNotificationItemsRead() {
    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "READ_ALL" }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = typeof j?.error === "string" ? j.error : `Failed (${res.status})`;
      throw new Error(msg);
    }
    const unreadCount = typeof j?.unreadCount === "number" ? j.unreadCount : 0;
    setNotifUnreadCount(unreadCount);
    setNotifItems((prev) =>
      prev.map((item) => (item.readAt ? item : { ...item, readAt: new Date().toISOString() }))
    );
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
          {isKidView ? (
            isKidMobile ? (
              <Avatar
                src={kidSummary?.avatarUrl || undefined}
                sx={{ width: 36, height: 36, fontSize: "0.95rem", bgcolor: "primary.main" }}
              >
                {(username?.trim().charAt(0) || "K").toUpperCase()}
              </Avatar>
            ) : (
              <IconButton
                edge="start"
                aria-label="Open kid menu"
                onClick={(event) => setKidMenuAnchorEl(event.currentTarget)}
                sx={{ p: 0.25 }}
              >
                <Avatar
                  src={kidSummary?.avatarUrl || undefined}
                  sx={{ width: 36, height: 36, fontSize: "0.95rem", bgcolor: "primary.main" }}
                >
                  {(username?.trim().charAt(0) || "K").toUpperCase()}
                </Avatar>
              </IconButton>
            )
          ) : (
            <IconButton edge="start" onClick={() => setOpen(true)} aria-label="menu">
              <MenuRoundedIcon />
            </IconButton>
          )}

          {isKidView ? (
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 900, lineHeight: 1.1 }} noWrap>
                {name || username || "Kid"}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                @{username || "kid"}
              </Typography>
            </Box>
          ) : (
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ flexGrow: 1, minWidth: 0 }}>
              <Avatar sx={{ bgcolor: "primary.main", width: 34, height: 34 }}>
                <ChecklistRoundedIcon fontSize="small" />
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 900, lineHeight: 1.1 }} noWrap>
                  Family Chores
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  Parent mode
                  {username ? ` • @${username}` : ""}
                </Typography>
              </Box>
            </Stack>
          )}

          <Stack direction="row" spacing={0.75} alignItems="center">
            {isKidView && (
              <>
                <Tooltip title="Coins this week">
                  <Chip
                    size="small"
                    color="primary"
                    variant="outlined"
                    icon={<TokenRoundedIcon />}
                    label={String(kidSummary?.weeklyPoints ?? 0)}
                  />
                </Tooltip>
                <Tooltip title="Total stars earned">
                  <Chip
                    size="small"
                    color="warning"
                    variant="outlined"
                    icon={<GradeRoundedIcon />}
                    label={String(kidSummary?.totalStarsEarned ?? 0)}
                  />
                </Tooltip>
              </>
            )}
            <IconButton aria-label="notifications" onClick={openNotifications}>
              <Badge
                badgeContent={notifUnreadCount}
                color="error"
                overlap="circular"
                max={99}
                invisible={notifUnreadCount === 0}
              >
                <NotificationsRoundedIcon />
              </Badge>
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      {!isKidView && (
        <Drawer open={open} onClose={() => setOpen(false)} anchor="left">
          {DrawerContent}
        </Drawer>
      )}

      {!isKidMobile && (
        <Menu
          anchorEl={kidMenuAnchorEl}
          open={Boolean(kidMenuAnchorEl)}
          onClose={() => setKidMenuAnchorEl(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          PaperProps={{
            sx: {
              mt: 0.5,
              borderRadius: 2,
              minWidth: 210,
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
            },
          }}
        >
          {kidMenuNav.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <MenuItem
                key={item.href}
                selected={active}
                onClick={() => goKidMenu(item.href)}
                sx={{ py: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 34 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </MenuItem>
            );
          })}
          <Divider />
          <MenuItem
            onClick={async () => {
              await signOut({ redirect: false });
              window.location.assign("/login");
            }}
            sx={{ py: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 34 }}>
              <LogoutRoundedIcon />
            </ListItemIcon>
            <ListItemText primary="Log out" />
          </MenuItem>
        </Menu>
      )}

      <Drawer open={notifOpen} onClose={() => setNotifOpen(false)} anchor="right">
        <Box sx={{ width: 360, p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {isKidView ? "Messages" : "Notifications"}
            </Typography>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Button
                size="small"
                disabled={notifLoading || notifUnreadCount === 0}
                onClick={async () => {
                  try {
                    await markAllNotificationItemsRead();
                  } catch (e: unknown) {
                    const message = e instanceof Error ? e.message : String(e);
                    setNotifErr(message);
                  }
                }}
              >
                Mark all read
              </Button>
              <IconButton aria-label="refresh notifications" onClick={() => void loadNotifications()}>
                <RefreshRoundedIcon />
              </IconButton>
            </Stack>
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {isKidView ? "Reminders and updates for you." : "In-app reminders and recent updates."}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: "block" }}>
            {isKidView
              ? "Tap a message to open it and mark it as read."
              : "Open a notification to mark it read, or use Mark all read."}
          </Typography>

          <Divider sx={{ my: 1.5 }} />

          {notifErr && (
            <Typography color="error" variant="body2" sx={{ mb: 1 }}>
              {notifErr}
            </Typography>
          )}

          {notifLoading && (
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 1 }}>
              <CircularProgress size={18} />
              <Typography variant="body2">{isKidView ? "Loading messages..." : "Loading notifications..."}</Typography>
            </Stack>
          )}

          {!notifLoading && notifItems.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              {isKidView ? "No new messages." : "You're all caught up."}
            </Typography>
          )}

          <List disablePadding>
            {notifItems.map((item) => (
              <ListItemButton
                key={item.id}
                onClick={async () => {
                  try {
                    if (!item.readAt) await markNotificationRead(item.id);
                  } catch (e: unknown) {
                    const message = e instanceof Error ? e.message : String(e);
                    setNotifErr(message);
                  }
                  router.push(item.href);
                  setNotifOpen(false);
                }}
                sx={{
                  alignItems: "flex-start",
                  borderRadius: 2,
                  mb: 0.75,
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: item.readAt ? "transparent" : "primary.light",
                  bgcolor: item.readAt ? "transparent" : "rgba(25,118,210,0.08)",
                  opacity: item.readAt ? 0.8 : 1,
                  "&:hover": {
                    bgcolor: item.readAt ? "rgba(0,0,0,0.04)" : "rgba(25,118,210,0.14)",
                  },
                }}
              >
                <ListItemText
                  primary={
                    <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                        {!item.readAt && (
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              bgcolor: "primary.main",
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <Typography variant="body1" sx={{ fontWeight: item.readAt ? 600 : 900 }} noWrap>
                          {item.title}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        {!item.readAt && <Chip label="New" size="small" color="primary" />}
                        <Chip
                          label={item.kind === "REMINDER" ? (isKidView ? "To do" : "Reminder") : "Update"}
                          size="small"
                          color={notificationColor(item.severity)}
                        />
                        <IconButton
                          aria-label="dismiss notification"
                          size="small"
                          onClick={async (event) => {
                            event.stopPropagation();
                            try {
                              await dismissNotificationItem(item.id);
                            } catch (e: unknown) {
                              const message = e instanceof Error ? e.message : String(e);
                              setNotifErr(message);
                            }
                          }}
                        >
                          <CloseRoundedIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Stack>
                  }
                  secondary={
                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        {item.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(item.createdAt).toLocaleString()}
                      </Typography>
                    </Stack>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>

      {isKidMobile && (
        <Box
          sx={{
            position: "fixed",
            left: 10,
            right: 10,
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)",
            zIndex: 1200,
            border: "1px solid rgba(25, 118, 210, 0.20)",
            borderRadius: 3,
            background: "linear-gradient(180deg, rgba(247,251,255,0.98) 0%, rgba(238,246,255,0.98) 100%)",
            boxShadow: "0 10px 28px rgba(16, 24, 40, 0.18)",
            backdropFilter: "blur(10px)",
            px: 0.6,
          }}
        >
          <Stack direction="row" justifyContent="space-around" alignItems="center" sx={{ py: 0.65 }}>
            <IconButton
              aria-label="Today's chores"
              color={pathname === "/app/my-chores" ? "primary" : "default"}
              onClick={() => router.push("/app/my-chores")}
              sx={{
                width: 42,
                height: 42,
                border: "1px solid rgba(0,0,0,0.10)",
                bgcolor: pathname === "/app/my-chores" ? "primary.main" : "rgba(255,255,255,0.9)",
                color: pathname === "/app/my-chores" ? "common.white" : "text.secondary",
                boxShadow: pathname === "/app/my-chores" ? "0 5px 14px rgba(25,118,210,0.35)" : "none",
                "&:hover": {
                  bgcolor: pathname === "/app/my-chores" ? "primary.dark" : "rgba(255,255,255,1)",
                },
              }}
            >
              <ChecklistRoundedIcon />
            </IconButton>
            <IconButton
              aria-label="Stars & rewards"
              color={pathname === "/app/awards" ? "primary" : "default"}
              onClick={() => router.push("/app/awards")}
              sx={{
                width: 42,
                height: 42,
                border: "1px solid rgba(0,0,0,0.10)",
                bgcolor: pathname === "/app/awards" ? "warning.main" : "rgba(255,255,255,0.9)",
                color: pathname === "/app/awards" ? "common.white" : "text.secondary",
                boxShadow: pathname === "/app/awards" ? "0 5px 14px rgba(237,108,2,0.35)" : "none",
                "&:hover": {
                  bgcolor: pathname === "/app/awards" ? "warning.dark" : "rgba(255,255,255,1)",
                },
              }}
            >
              <EmojiEventsRoundedIcon />
            </IconButton>
            <IconButton
              aria-label="Log out"
              onClick={async () => {
                await signOut({ redirect: false });
                window.location.assign("/login");
              }}
              sx={{
                width: 42,
                height: 42,
                border: "1px solid rgba(0,0,0,0.10)",
                bgcolor: "rgba(255,255,255,0.9)",
                color: "text.secondary",
                "&:hover": { bgcolor: "rgba(255,255,255,1)", color: "error.main" },
              }}
            >
              <LogoutRoundedIcon />
            </IconButton>
          </Stack>
        </Box>
      )}

      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 }, pb: isKidMobile ? { xs: 11, sm: 3 } : undefined }}>
        {/* slightly elevated content feel */}
        <Box sx={{ p: { xs: 0, sm: 1 } }}>{children}</Box>
      </Container>
    </Box>
  );
}
