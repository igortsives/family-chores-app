"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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

import ChecklistRoundedIcon from "@mui/icons-material/ChecklistRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import LeaderboardRoundedIcon from "@mui/icons-material/LeaderboardRounded";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import QueryStatsRoundedIcon from "@mui/icons-material/QueryStatsRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import GradeRoundedIcon from "@mui/icons-material/GradeRounded";
import TokenRoundedIcon from "@mui/icons-material/TokenRounded";
import ArrowDropDownRoundedIcon from "@mui/icons-material/ArrowDropDownRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import WbSunnyRoundedIcon from "@mui/icons-material/WbSunnyRounded";
import BedtimeRoundedIcon from "@mui/icons-material/BedtimeRounded";

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

type HeaderMe = {
  id: string;
  role: "ADULT" | "KID";
  username: string | null;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
};

const PROFILE_MENU_PAPER_PROPS = {
  sx: {
    mt: 0.5,
    borderRadius: 2,
    minWidth: 250,
    border: "1px solid",
    borderColor: "divider",
    boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
  },
} as const;

function HeaderGreeting({
  tooltipTitle,
  text,
  maxWidth,
  icon,
  iconBg,
  iconColor,
}: {
  tooltipTitle: string;
  text: string;
  maxWidth: { xs: number; sm: number };
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Tooltip title={tooltipTitle}>
      <Box
        sx={{
          minWidth: 0,
          maxWidth,
          px: { xs: 0.4, sm: 0.8 },
          py: { xs: 0.2, sm: 0.28 },
          display: "flex",
          alignItems: "center",
          gap: { xs: 0.35, sm: 0.55 },
        }}
      >
        <Box
          sx={{
            width: { xs: 17, sm: 19 },
            height: { xs: 17, sm: 19 },
            borderRadius: "50%",
            bgcolor: iconBg,
            color: iconColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 800,
            lineHeight: 1.1,
            color: "text.primary",
            fontSize: { xs: "0.76rem", sm: "0.96rem" },
          }}
          noWrap
        >
          {text}
        </Typography>
      </Box>
    </Tooltip>
  );
}

function HeaderCenterNav({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate: (href: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        pointerEvents: "none",
      }}
    >
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Tooltip title={item.label} key={item.href}>
            <Box
              sx={{
                pointerEvents: "auto",
                position: "relative",
                display: "flex",
                alignItems: "center",
                height: "100%",
                px: 0.3,
                "&::after": {
                  content: "\"\"",
                  position: "absolute",
                  left: 6,
                  right: 6,
                  bottom: -1,
                  height: 3,
                  borderRadius: "3px 3px 0 0",
                  bgcolor: active ? "primary.main" : "transparent",
                  transition: "background-color 120ms ease",
                },
                "&:hover::after": { bgcolor: active ? "primary.main" : "rgba(25,118,210,0.42)" },
              }}
            >
              <IconButton
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                onClick={() => onNavigate(item.href)}
                sx={{
                  border: "1px solid rgba(0,0,0,0.10)",
                  bgcolor: active ? "rgba(25,118,210,0.14)" : "rgba(255,255,255,0.88)",
                  color: active ? "primary.main" : "text.secondary",
                  width: 38,
                  height: 38,
                  cursor: "pointer",
                  transition: "background-color 120ms ease, color 120ms ease, transform 120ms ease",
                  "&:hover": {
                    bgcolor: active ? "rgba(25,118,210,0.18)" : "rgba(255,255,255,1)",
                    color: active ? "primary.main" : "text.primary",
                    transform: "translateY(-1px)",
                  },
                }}
              >
                {item.icon}
              </IconButton>
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}

function ProfileAvatarTrigger({
  title,
  tooltip,
  avatarUrl,
  initial,
  onClick,
}: {
  title: string;
  tooltip: string;
  avatarUrl: string | null;
  initial: string;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
}) {
  return (
    <Tooltip title={tooltip}>
      <IconButton
        aria-label={title}
        onClick={onClick}
        sx={{
          p: 0.25,
          border: "1px solid rgba(0,0,0,0.10)",
          borderRadius: 999,
          bgcolor: "rgba(255,255,255,0.92)",
          "&:hover": { bgcolor: "rgba(255,255,255,1)" },
        }}
      >
        <Box sx={{ position: "relative", display: "inline-flex", lineHeight: 0 }}>
          <Avatar
            src={avatarUrl || undefined}
            sx={{ width: 38, height: 38, fontSize: "0.95rem", bgcolor: "primary.main" }}
          >
            {initial}
          </Avatar>
          <Box
            sx={{
              position: "absolute",
              right: -2,
              bottom: -2,
              width: 16,
              height: 16,
              borderRadius: "50%",
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ArrowDropDownRoundedIcon sx={{ fontSize: 13 }} />
          </Box>
        </Box>
      </IconButton>
    </Tooltip>
  );
}

function ProfileMenuIdentity({
  avatarUrl,
  initial,
  name,
  subtitle,
}: {
  avatarUrl: string | null;
  initial: string;
  name: string;
  subtitle: string;
}) {
  return (
    <Box sx={{ px: 1.5, py: 1.25 }}>
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Avatar src={avatarUrl || undefined} sx={{ width: 44, height: 44, bgcolor: "primary.main" }}>
          {initial}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, lineHeight: 1.1 }} noWrap>
            {name}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {subtitle}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}

export default function BrandShell({
  children,
  role,
  username,
  name,
  avatarUrl,
}: {
  children: React.ReactNode;
  role?: "ADULT" | "KID";
  username?: string;
  name?: string | null;
  avatarUrl?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isKidView = role === "KID";
  const isMobile = useMediaQuery("(max-width:600px)");
  const [adultMenuAnchorEl, setAdultMenuAnchorEl] = React.useState<HTMLElement | null>(null);
  const [kidMenuAnchorEl, setKidMenuAnchorEl] = React.useState<HTMLElement | null>(null);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [notifLoading, setNotifLoading] = React.useState(false);
  const [notifErr, setNotifErr] = React.useState<string | null>(null);
  const [notifItems, setNotifItems] = React.useState<NotificationItem[]>([]);
  const [notifUnreadCount, setNotifUnreadCount] = React.useState(0);
  const [kidSummary, setKidSummary] = React.useState<KidSummary | null>(null);
  const [headerMe, setHeaderMe] = React.useState<HeaderMe | null>(null);

  const nav: NavItem[] = React.useMemo(
    () =>
      [
        { label: "Chores", href: "/app/my-chores", icon: <ChecklistRoundedIcon />, show: isKidView },
        { label: isKidView ? "Rewards" : "Awards", href: "/app/awards", icon: <EmojiEventsRoundedIcon /> },
        { label: isKidView ? "Scoreboard" : "Leaderboard", href: "/app/leaderboard", icon: <LeaderboardRoundedIcon />, show: !isKidView },
        { label: "Approvals", href: "/app/admin/approvals", icon: <FactCheckRoundedIcon />, show: role === "ADULT" },
        { label: "Star exchanges", href: "/app/admin/stars", icon: <AutoAwesomeRoundedIcon />, show: role === "ADULT" },
        { label: "Family stats", href: "/app/admin/stats", icon: <QueryStatsRoundedIcon />, show: role === "ADULT" },
        { label: "Settings", href: "/app/admin/settings", icon: <SettingsRoundedIcon />, show: role === "ADULT" },
      ].filter((x) => x.show !== false),
    [isKidView, role],
  );
  const adultDisplayName = React.useMemo(() => {
    if (typeof headerMe?.name === "string" && headerMe.name.trim().length > 0) return headerMe.name.trim();
    if (typeof name === "string" && name.trim().length > 0) return name.trim();
    if (typeof headerMe?.username === "string" && headerMe.username.trim().length > 0) return headerMe.username.trim();
    if (typeof username === "string" && username.trim().length > 0) return username.trim();
    return "Parent";
  }, [headerMe, name, username]);
  const adultFirstName = React.useMemo(
    () => adultDisplayName.split(/\s+/).find(Boolean) ?? adultDisplayName,
    [adultDisplayName],
  );
  const adultCompactName = React.useMemo(
    () => (adultFirstName.length > 8 ? adultFirstName.slice(0, 8) : adultFirstName),
    [adultFirstName],
  );
  const adultGreetingText = React.useMemo(
    () => `Hi, ${adultDisplayName}!`,
    [adultDisplayName],
  );
  const fallbackAvatarUrl = React.useMemo(() => {
    if (typeof avatarUrl !== "string") return null;
    const x = avatarUrl.trim();
    return x.length > 0 ? x : null;
  }, [avatarUrl]);
  const serverAvatarUrl = React.useMemo(() => {
    if (typeof headerMe?.avatarUrl !== "string") return null;
    const x = headerMe.avatarUrl.trim();
    return x.length > 0 ? x : null;
  }, [headerMe]);
  const kidDisplayName = React.useMemo(() => {
    if (typeof name === "string" && name.trim().length > 0) return name.trim();
    if (typeof username === "string" && username.trim().length > 0) return username.trim();
    return "Kid";
  }, [name, username]);
  const kidFirstName = React.useMemo(
    () => kidDisplayName.split(/\s+/).find(Boolean) ?? kidDisplayName,
    [kidDisplayName],
  );
  const kidCompactName = React.useMemo(
    () => (kidFirstName.length > 6 ? kidFirstName.slice(0, 6) : kidFirstName),
    [kidFirstName],
  );
  const kidHeaderNav: NavItem[] = React.useMemo(
    () => [
      { label: "Chores", href: "/app/my-chores", icon: <ChecklistRoundedIcon /> },
      { label: "Rewards", href: "/app/awards", icon: <EmojiEventsRoundedIcon /> },
    ],
    [],
  );
  const adultHeaderNav = React.useMemo(() => {
    const priorityByHref = new Map<string, number>([
      ["/app/admin/stats", 0],
      ["/app/admin/approvals", 1],
      ["/app/admin/stars", 2],
    ]);
    return nav
      .filter((item) => item.href !== "/app/admin/settings")
      .map((item, index) => {
        const rank = priorityByHref.get(item.href);
        return {
          item,
          order: rank === undefined ? 100 + index : rank,
        };
      })
      .sort((a, b) => a.order - b.order)
      .map((entry) => entry.item);
  }, [nav]);
  const adultMenuNav = React.useMemo(
    () => nav.filter((item) => item.href === "/app/admin/settings"),
    [nav],
  );
  const headerCenterNav = React.useMemo(
    () => (isKidView ? kidHeaderNav : adultHeaderNav),
    [adultHeaderNav, isKidView, kidHeaderNav],
  );
  const timePreview = searchParams.get("timeOfDay");
  const forcedMode = timePreview === "morning" || timePreview === "afternoon" || timePreview === "evening"
    ? timePreview
    : null;
  const activeDayMode = React.useMemo(() => {
    if (forcedMode) return forcedMode;
    const hour = new Date().getHours();
    if (hour < 12) return "morning" as const;
    if (hour < 18) return "afternoon" as const;
    return "evening" as const;
  }, [forcedMode]);
  const kidGreetingMeta = React.useMemo(() => {
    if (activeDayMode === "morning") {
      return {
        text: `Good morning, ${kidDisplayName}!`,
        mode: "morning" as const,
        headerTintStrong: "rgba(30, 136, 229, 0.11)",
        headerTintSoft: "rgba(30, 136, 229, 0.04)",
        iconBg: "rgba(30, 136, 229, 0.16)",
        iconColor: "#0d47a1",
      };
    }
    if (activeDayMode === "afternoon") {
      return {
        text: `Good afternoon, ${kidDisplayName}!`,
        mode: "afternoon" as const,
        headerTintStrong: "rgba(251, 140, 0, 0.11)",
        headerTintSoft: "rgba(251, 140, 0, 0.04)",
        iconBg: "rgba(251, 140, 0, 0.14)",
        iconColor: "#bf360c",
      };
    }
    return {
      text: `Good evening, ${kidDisplayName}!`,
      mode: "evening" as const,
      headerTintStrong: "rgba(94, 53, 177, 0.11)",
      headerTintSoft: "rgba(94, 53, 177, 0.04)",
      iconBg: "rgba(94, 53, 177, 0.16)",
      iconColor: "#4527a0",
    };
  }, [kidDisplayName, activeDayMode]);
  const kidGreetingHeaderText = isMobile ? `Hi, ${kidCompactName}!` : kidGreetingMeta.text;
  const kidHeaderNeutral = "rgba(255,255,255,0.70)";
  const shellBackground = React.useMemo(() => {
    if (!isKidView) {
      return "radial-gradient(1100px circle at 15% 10%, rgba(25,118,210,0.10), transparent 55%), radial-gradient(900px circle at 85% 15%, rgba(156,39,176,0.08), transparent 45%), linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.00))";
    }
    if (activeDayMode === "morning") {
      return "radial-gradient(980px circle at 92% 6%, rgba(33,150,243,0.045), transparent 52%), linear-gradient(180deg, rgba(255,255,255,0.995), rgba(252,254,255,0.985))";
    }
    if (activeDayMode === "afternoon") {
      return "radial-gradient(980px circle at 92% 6%, rgba(255,183,77,0.045), transparent 52%), linear-gradient(180deg, rgba(255,255,255,0.995), rgba(255,253,248,0.985))";
    }
    return "radial-gradient(1020px circle at 92% 6%, rgba(121,134,203,0.05), transparent 54%), linear-gradient(180deg, rgba(255,255,255,0.995), rgba(252,252,255,0.985))";
  }, [isKidView, activeDayMode]);
  const sharedAvatarUrl = serverAvatarUrl ?? fallbackAvatarUrl;
  const kidAvatarUrl = kidSummary?.avatarUrl ?? sharedAvatarUrl;
  const adultInitial = (adultDisplayName.charAt(0) || "P").toUpperCase();

  const go = React.useCallback((href: string) => {
    router.push(href);
    setAdultMenuAnchorEl(null);
    setKidMenuAnchorEl(null);
  }, [router]);

  const logout = React.useCallback(async () => {
    await signOut({ redirect: false });
    window.location.assign("/login");
  }, []);

  const loadHeaderState = React.useCallback(async (withSpinner = true) => {
    setNotifErr(null);
    if (withSpinner) setNotifLoading(true);
    try {
      const res = await fetch("/api/header-state", { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof j?.error === "string" ? j.error : `Failed (${res.status})`;
        throw new Error(msg);
      }

      const notifications = j?.notifications ?? {};
      const items = Array.isArray(notifications?.items) ? (notifications.items as NotificationItem[]) : [];
      const unreadCount = typeof notifications?.unreadCount === "number" ? notifications.unreadCount : 0;
      setNotifItems(items);
      setNotifUnreadCount(unreadCount);
      const me = j?.me ?? null;
      const normalizedMe = me && typeof me === "object"
        ? {
            id: typeof me.id === "string" ? me.id : "",
            role: me.role === "ADULT" ? "ADULT" : "KID",
            username: typeof me.username === "string" ? me.username : null,
            name: typeof me.name === "string" ? me.name : null,
            email: typeof me.email === "string" ? me.email : null,
            avatarUrl: typeof me.avatarUrl === "string" ? me.avatarUrl : null,
          } as HeaderMe
        : null;
      setHeaderMe(normalizedMe);

      if (isKidView) {
        const summary = j?.kidSummary ?? null;
        const weeklyPoints = typeof summary?.weeklyPoints === "number" ? summary.weeklyPoints : 0;
        const totalStarsEarned = typeof summary?.totalStarsEarned === "number" ? summary.totalStarsEarned : 0;
        const avatarUrl = typeof summary?.avatarUrl === "string" && summary.avatarUrl.trim().length > 0
          ? summary.avatarUrl
          : null;
        setKidSummary({ weeklyPoints, totalStarsEarned, avatarUrl });
      } else {
        setKidSummary(null);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setNotifErr(message);
    } finally {
      if (withSpinner) setNotifLoading(false);
    }
  }, [isKidView]);

  React.useEffect(() => {
    void loadHeaderState(true);
    const timer = window.setInterval(() => {
      void loadHeaderState(false);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [loadHeaderState]);

  function notificationColor(severity: NotificationItem["severity"]) {
    if (severity === "SUCCESS") return "success" as const;
    if (severity === "WARNING") return "warning" as const;
    if (severity === "ERROR") return "error" as const;
    return "info" as const;
  }

  function openNotifications() {
    setNotifOpen(true);
    void loadHeaderState(true);
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

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: shellBackground,
        transition: "background 240ms ease",
      }}
    >
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          backgroundColor: kidHeaderNeutral,
          backgroundImage: isKidView
            ? `linear-gradient(90deg, ${kidGreetingMeta.headerTintStrong} 0%, ${kidGreetingMeta.headerTintSoft} 18%, ${kidHeaderNeutral} 34%, ${kidHeaderNeutral} 100%)`
            : undefined,
        }}
      >
        <Toolbar sx={{ gap: 1, position: "relative" }}>
          {isKidView ? (
            <HeaderGreeting
              tooltipTitle={kidGreetingMeta.text}
              text={kidGreetingHeaderText}
              maxWidth={{ xs: 104, sm: 300 }}
              icon={
                kidGreetingMeta.mode === "morning" ? (
                  <LightModeRoundedIcon sx={{ fontSize: { xs: 12, sm: 14 } }} />
                ) : kidGreetingMeta.mode === "afternoon" ? (
                  <WbSunnyRoundedIcon sx={{ fontSize: { xs: 12, sm: 14 } }} />
                ) : (
                  <BedtimeRoundedIcon sx={{ fontSize: { xs: 12, sm: 14 } }} />
                )
              }
              iconBg={kidGreetingMeta.iconBg}
              iconColor={kidGreetingMeta.iconColor}
            />
          ) : (
            <HeaderGreeting
              tooltipTitle={adultGreetingText}
              text={isMobile ? `Hi, ${adultCompactName}!` : adultGreetingText}
              maxWidth={{ xs: 128, sm: 240 }}
              icon={<ChecklistRoundedIcon sx={{ fontSize: { xs: 12, sm: 14 } }} />}
              iconBg="rgba(25,118,210,0.14)"
              iconColor="primary.main"
            />
          )}

          <HeaderCenterNav items={headerCenterNav} pathname={pathname} onNavigate={go} />

          <Box sx={{ flexGrow: 1, minWidth: 0 }} />

          <Stack direction="row" spacing={0.75} alignItems="center">
            {isKidView && !isMobile && (
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
            {!isKidView && (
              <ProfileAvatarTrigger
                title="Open profile menu"
                tooltip={adultDisplayName}
                avatarUrl={sharedAvatarUrl}
                initial={adultInitial}
                onClick={(event) => setAdultMenuAnchorEl(event.currentTarget)}
              />
            )}
            {isKidView && (
              <ProfileAvatarTrigger
                title="Open profile menu"
                tooltip="Profile menu"
                avatarUrl={kidAvatarUrl}
                initial={(kidDisplayName.charAt(0) || "K").toUpperCase()}
                onClick={(event) => setKidMenuAnchorEl(event.currentTarget)}
              />
            )}
          </Stack>
        </Toolbar>
      </AppBar>

      {!isKidView && (
        <Menu
          anchorEl={adultMenuAnchorEl}
          open={Boolean(adultMenuAnchorEl)}
          onClose={() => setAdultMenuAnchorEl(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          PaperProps={PROFILE_MENU_PAPER_PROPS}
        >
          <ProfileMenuIdentity
            avatarUrl={sharedAvatarUrl}
            initial={adultInitial}
            name={adultDisplayName}
            subtitle={username ? `@${username}` : "Signed in"}
          />
          <Divider />
          {adultMenuNav.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <MenuItem
                key={item.href}
                selected={active}
                onClick={() => go(item.href)}
                sx={{ py: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 34 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </MenuItem>
            );
          })}
          <Divider />
          <MenuItem
            onClick={logout}
            sx={{ py: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 34 }}>
              <LogoutRoundedIcon />
            </ListItemIcon>
            <ListItemText primary="Log out" />
          </MenuItem>
        </Menu>
      )}

      {isKidView && (
        <Menu
          anchorEl={kidMenuAnchorEl}
          open={Boolean(kidMenuAnchorEl)}
          onClose={() => setKidMenuAnchorEl(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          PaperProps={PROFILE_MENU_PAPER_PROPS}
        >
          <ProfileMenuIdentity
            avatarUrl={kidAvatarUrl}
            initial={(kidDisplayName.charAt(0) || "K").toUpperCase()}
            name={kidDisplayName}
            subtitle={username ? `@${username}` : "Signed in"}
          />
          {isMobile && (
            <Box sx={{ px: 1.5, pb: 1.25 }}>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Chip
                  size="small"
                  color="primary"
                  variant="outlined"
                  icon={<TokenRoundedIcon />}
                  label={`${kidSummary?.weeklyPoints ?? 0} coins`}
                />
                <Chip
                  size="small"
                  color="warning"
                  variant="outlined"
                  icon={<GradeRoundedIcon />}
                  label={`${kidSummary?.totalStarsEarned ?? 0} stars`}
                />
              </Stack>
            </Box>
          )}
          <Divider />
          <MenuItem
            onClick={logout}
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
              <IconButton aria-label="refresh notifications" onClick={() => void loadHeaderState(true)}>
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
                  disableTypography
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

      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 } }}>
        {/* slightly elevated content feel */}
        <Box sx={{ p: { xs: 0, sm: 1 } }}>{children}</Box>
      </Container>
    </Box>
  );
}
