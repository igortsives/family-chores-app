"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CircularProgress, Stack, Typography } from "@mui/material";

export default function AppHome() {
  const router = useRouter();
  const { data: session, status } = useSession();

  React.useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.replace("/login");
      return;
    }
    const role = (session.user as any)?.role as "ADULT" | "KID" | undefined;
    router.replace(role === "ADULT" ? "/app/admin/stats" : "/app/my-chores");
  }, [router, session, status]);

  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <CircularProgress size={18} />
      <Typography>Opening your dashboard…</Typography>
    </Stack>
  );
}
