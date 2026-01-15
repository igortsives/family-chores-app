import { Container, Typography, Stack } from "@mui/material";
import LinkButton from "@/components/LinkButton";

export default function NotFound() {
  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Stack spacing={2}>
        <Typography variant="h4">Page not found</Typography>
        <Typography color="text.secondary">That page doesn’t exist.</Typography>
        <LinkButton variant="contained" href="/app">
          Go to app
        </LinkButton>
      </Stack>
    </Container>
  );
}
