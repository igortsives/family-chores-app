import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { authObsNow, logAuthObservability } from "@/lib/auth-observability";

type GuardOptions = {
  source?: string;
  logOutcome?: boolean;
};

export async function requireSessionUser(options: GuardOptions = {}) {
  const source = options.source ?? "unknown";
  const logOutcome = options.logOutcome ?? true;
  const startedAt = authObsNow();
  const sessionStartedAt = authObsNow();
  const session = await getServerSession(authOptions);
  const sessionMs = authObsNow() - sessionStartedAt;
  const uid = (session?.user as any)?.id as string | undefined;
  if (!uid) {
    if (logOutcome) {
      logAuthObservability("requireSessionUser.unauthorized", {
        source,
        reason: "missing_uid",
        sessionMs,
        totalMs: authObsNow() - startedAt,
      });
    }
    return { status: 401 as const, error: "Unauthorized" as const };
  }

  const dbStartedAt = authObsNow();
  const me = await prisma.user.findUnique({
    where: { id: uid },
    select: {
      id: true,
      role: true,
      familyId: true,
      username: true,
      name: true,
      avatarUrl: true,
      email: true,
    },
  });
  const dbMs = authObsNow() - dbStartedAt;

  if (!me) {
    if (logOutcome) {
      logAuthObservability("requireSessionUser.unauthorized", {
        source,
        reason: "uid_not_found",
        userId: uid,
        sessionMs,
        dbMs,
        totalMs: authObsNow() - startedAt,
      });
    }
    return { status: 401 as const, error: "Unauthorized" as const };
  }
  if (logOutcome) {
    logAuthObservability("requireSessionUser.ok", {
      source,
      userId: me.id,
      role: me.role,
      familyId: me.familyId,
      sessionMs,
      dbMs,
      totalMs: authObsNow() - startedAt,
    });
  }
  return { me };
}

export async function requireAdult(options: GuardOptions = {}) {
  const source = options.source ?? "unknown";
  const startedAt = authObsNow();
  const r = await requireSessionUser({ source, logOutcome: false });
  if ("status" in r) {
    logAuthObservability("requireAdult.unauthorized", {
      source,
      totalMs: authObsNow() - startedAt,
    });
    return r;
  }
  if (r.me.role !== "ADULT") {
    logAuthObservability("requireAdult.forbidden", {
      source,
      userId: r.me.id,
      role: r.me.role,
      familyId: r.me.familyId,
      totalMs: authObsNow() - startedAt,
    });
    return { status: 403 as const, error: "Forbidden" as const };
  }
  logAuthObservability("requireAdult.ok", {
    source,
    userId: r.me.id,
    familyId: r.me.familyId,
    totalMs: authObsNow() - startedAt,
  });
  return r;
}
