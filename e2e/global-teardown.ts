import { cleanupE2ETestData, cleanupLegacyE2EArtifacts } from "./test-data";

export default async function globalTeardown() {
  await cleanupE2ETestData();
  await cleanupLegacyE2EArtifacts();
}
