"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  AppBar,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";

type NavItem = { href: string; label: string; adultOnly?: boolean };

const NAV: NavItem[] = [
  { href: "/app/my-chores", label: "My chores" },
  { href: "/app/leaderboard", label: "Leaderboard" },
  { href: "/app/admin/chores", label: "Parent admin", adultOnly: true },
  { href: "/app/admin/family", label: "Family", adultOnly: true },
  { href: "/app/admin/approvals", label: "Approvals", adultOnly: true },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const role = (session?.user as any)?.role as "ADULT" | "KID" | undefined;

  const pathname = usePathname();
  const router = useRouter();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [open, setOpen] = React.useState(false);

  const items = React.useMemo(
    () => NAV.filter((n) => (n.adultOnly ? role === "ADULT" : true)),
    [role]
  );

  async function doLogout() {
    await signOut({ redirect: false });
    router.push("/login");
  }

  const brand = (
    <Typography
      variant="h6"
      sx={{
        fontWeight: 700,
        letterSpacing: 0.2,
        lineHeight: 1.1,
        whiteSpace: "nowrap",
      }}
    >
      Family Chores
    </Typography>
  );

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <AppBar position="sticky" elevation={0} sx={{ borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
        <Toolbar sx={{ gap: 1 }}>
          {status === "authenticated" && isMobile && (
            <IconButton color="inherit" aria-label="Open menu" onClick={() => setOpen(true)} edge="start">
              <MenuIcon />
            </IconButton>
          )}

          {brand}

          <Box sx={{ flexGrow: 1 }} />

          {status === "authenticated" && !isMobile && (
            <Stack direction="row" spacing={1} alignItems="center">
              {items.map((it) => (
                <Button
                  key={it.href}
                  component={Link as any}
                  href={it.href}
                  color="inherit"
                  size="small"
                  variant={pathname === it.href ? "outlined" : "text"}
                  sx={{ borderColor: "rgba(255,255,255,0.35)" }}
                >
                  {it.label}
                </Button>
              ))}

              <IconButton color="inherit" aria-label="Log out" onClick={doLogout}>
                <LogoutIcon />
              </IconButton>
            </Stack>
          )}

          {/* Mobile: logout in appbar for quick access */}
          {status === "authenticated" && isMobile && (
            <IconButton color="inherit" aria-label="Log out" onClick={doLogout}>
              <LogoutIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{ sx: { width: 280 } }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Menu
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {role === "ADULT" ? "Parent" : "Kid"} view
          </Typography>
        </Box>
        <Divider />
        <List sx={{ py: 0 }}>
          {items.map((it) => (
            <ListItemButton
              key={it.href}
              selected={pathname === it.href}
              onClick={() => {
                setOpen(false);
                router.push(it.href);
              }}
            >
              <ListItemText primary={it.label} />
            </ListItemButton>
          ))}
        </List>
        <Box sx={{ flexGrow: 1 }} />
        <Divider />
        <List sx={{ py: 0 }}>
          <ListItemButton
            onClick={async () => {
              setOpen(false);
              await doLogout();
            }}
          >
            <ListItemText primary="Log out" />
          </ListItemButton>
        </List>
      </Drawer>

      <Container maxWidth="md" sx={{ py: 3 }}>
        {children}
      </Container>
    </Box>
  );
}
