export type TimeOfDayMode = "morning" | "afternoon" | "evening";

const VALID_MODES = new Set<TimeOfDayMode>(["morning", "afternoon", "evening"]);

type StatusRow = {
  choreId: string;
  todayStatus: string;
};

function isCompletedStatus(status: string) {
  return status === "APPROVED" || status === "PENDING" || status === "REJECTED";
}

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

export function kidDaySubheading(
  rows: ReadonlyArray<Pick<StatusRow, "todayStatus">> | null | undefined,
  isSelectedToday: boolean,
  motivationMessage: string,
): string {
  if (!rows || rows.length === 0) return motivationMessage;

  if (isSelectedToday) {
    return areAllChoresDone(rows, true)
      ? "Awesome job! You finished all your chores."
      : motivationMessage;
  }

  const allApproved = rows.every((row) => row.todayStatus === "APPROVED");
  if (allApproved) {
    return "Great work that day.";
  }

  const someCompleted = rows.some((row) => isCompletedStatus(row.todayStatus));
  if (someCompleted) {
    return "Nice effort that day.";
  }

  return "Next time, you've got this.";
}
