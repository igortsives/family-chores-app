export type TimeOfDayMode = "morning" | "afternoon" | "evening";

const VALID_MODES = new Set<TimeOfDayMode>(["morning", "afternoon", "evening"]);

type StatusRow = {
  choreId: string;
  todayStatus: string;
};

export function resolveTimeOfDayMode(
  forcedMode: string | null | undefined,
  now: Date = new Date(),
): TimeOfDayMode {
  if (forcedMode && VALID_MODES.has(forcedMode as TimeOfDayMode)) {
    return forcedMode as TimeOfDayMode;
  }
  const hour = now.getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export function kidMotivationMessage(mode: TimeOfDayMode): string {
  if (mode === "morning") return "Morning mission: knock out your chores and shine!";
  if (mode === "afternoon") return "Awesome afternoon! Let’s finish a few chores.";
  return "Evening hero mode: wrap up chores and earn your rewards!";
}

export function areAllChoresDone(
  rows: ReadonlyArray<Pick<StatusRow, "todayStatus">> | null | undefined,
  isKidView: boolean,
): boolean {
  if (!isKidView || !rows || rows.length === 0) return false;
  return rows.every((row) => row.todayStatus === "PENDING" || row.todayStatus === "APPROVED");
}

export function willAllChoresBeDoneAfterSubmit(
  rows: ReadonlyArray<StatusRow> | null | undefined,
  completedChoreId: string,
): boolean {
  if (!rows || rows.length === 0) return false;
  const projectedRows = rows.map((row) =>
    row.choreId === completedChoreId ? { ...row, todayStatus: "PENDING" } : row
  );
  return projectedRows.every((row) => row.todayStatus === "PENDING" || row.todayStatus === "APPROVED");
}
