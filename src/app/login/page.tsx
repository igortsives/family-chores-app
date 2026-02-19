"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ChecklistRoundedIcon from "@mui/icons-material/ChecklistRounded";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    const e = params.get("error");
    if (e === "CredentialsSignin") setErr("Invalid username or password.");
    else if (e) setErr("Sign-in failed. Please try again.");
  }, [params]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);

    try {
      const res = await signIn("credentials", {
        username,
        password,
        redirect: false,
        callbackUrl: "/app",
      });

      if (!res || res.error) {
        setErr("Invalid username or password.");
        return;
      }

      router.push("/app");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(1200px circle at 20% 10%, rgba(25,118,210,0.12), transparent 55%), radial-gradient(900px circle at 80% 20%, rgba(156,39,176,0.10), transparent 45%), linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.00))",
        px: 2,
        py: 6,
      }}
    >
      <Container maxWidth="sm">
        <Card variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Stack spacing={2.5}>
              {/* Branding */}
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar
                  sx={{
                    width: 44,
                    height: 44,
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                  }}
                >
                  <ChecklistRoundedIcon />
                </Avatar>

                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                    Family Chores
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.25 }}>
                    Finish chores, earn stars, unlock rewards.
                  </Typography>
                </Box>
              </Stack>

              <Divider />

              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Sign in
                </Typography>
                <Typography color="text.secondary">
                  Enter your username and password.
                </Typography>
              </Box>

              {err && <Alert severity="error">{err}</Alert>}

              <Box component="form" onSubmit={onSubmit}>
                <Stack spacing={2}>
                  <TextField
                    label="Username"
                    value={username}
                    autoComplete="username"
                    onChange={(e) => setUsername(e.target.value)}
                    fullWidth
                    required
                  />
                  <TextField
                    label="Password"
                    type="password"
                    value={password}
                    autoComplete="current-password"
                    onChange={(e) => setPassword(e.target.value)}
                    fullWidth
                    required
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={submitting}
                    sx={{ borderRadius: 2 }}
                  >
                    {submitting ? (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CircularProgress size={18} />
                        <span>Signing in…</span>
                      </Stack>
                    ) : (
                      "Sign in"
                    )}
                  </Button>

                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mt: 0.5 }}>
                    Kids mark chores done. Parents check and approve.
                  </Typography>
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
