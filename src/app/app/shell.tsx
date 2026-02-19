"use client";
import * as React from "react";
import Link from "next/link";
import { AppBar, Toolbar, Typography, Button, Stack, Container, Box } from "@mui/material";

export default function AppShell({ children, role, email }: { children: React.ReactNode; role: "ADULT" | "KID"; email: string }) {
  return (
    <>
      <AppBar position="sticky" elevation={1}>
        <Toolbar sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
          <Box>
            <Typography variant="h6">Family Chores</Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>{email} ({role})</Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            {role === "ADULT" && <Button color="inherit" component={Link} href="/app/admin/chores">Configure</Button>}
            {role === "ADULT" && <Button color="inherit" component={Link} href="/app/admin/approvals">Approvals</Button>}
            <Button color="inherit" component={Link} href="/app/my-chores">My Chores</Button>
            <Button color="inherit" component={Link} href="/app/leaderboard">Leaderboard</Button>
            <Button color="inherit" component={Link} href="/app/progress">Progress</Button>
            <Button color="inherit" component={Link} href="/api/auth/signout?callbackUrl=/login">Sign out</Button>
          </Stack>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ py: 3 }}>{children}</Container>
    </>
  );
}
