import { ensureE2ETestData } from "./test-data";

export default async function globalSetup() {
  await ensureE2ETestData();
}
