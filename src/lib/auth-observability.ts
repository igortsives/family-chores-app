type AuthObservabilityPayload = Record<string, unknown>;

function isEnabled() {
  return process.env.AUTH_OBSERVABILITY === "1";
}

export function authObsNow() {
  return Date.now();
}

export function logAuthObservability(event: string, payload: AuthObservabilityPayload) {
  if (!isEnabled()) return;
  const at = new Date().toISOString();
  // Structured log line for auth latency and outcomes.
  console.info(`[auth.obs] ${event}`, { at, ...payload });
}
