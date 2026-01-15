import { Container, Skeleton, Stack } from "@mui/material";
export default function Loading() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={2}>
        <Skeleton variant="text" height={40} />
        <Skeleton variant="rectangular" height={120} />
        <Skeleton variant="rectangular" height={120} />
      </Stack>
    </Container>
  );
}
