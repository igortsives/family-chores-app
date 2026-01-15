"use client";
import { Container, Typography, Button, Stack, Alert } from "@mui/material";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Stack spacing={2}>
        <Typography variant="h4">Something went wrong</Typography>
        <Alert severity="error">An unexpected error occurred.</Alert>
        <Button variant="contained" onClick={() => reset()}>Try again</Button>
      </Stack>
    </Container>
  );
}
