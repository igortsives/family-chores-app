-- Add indexes for API hot paths (family/member filters, due-date windows, completion status scans, notification feed/unread counts).

CREATE INDEX IF NOT EXISTS "User_familyId_role_isActive_isHidden_idx"
  ON "User"("familyId", "role", "isActive", "isHidden");

CREATE INDEX IF NOT EXISTS "Chore_familyId_active_idx"
  ON "Chore"("familyId", "active");

CREATE INDEX IF NOT EXISTS "ChoreAssignment_userId_idx"
  ON "ChoreAssignment"("userId");

CREATE INDEX IF NOT EXISTS "ChoreInstance_familyId_dueDate_idx"
  ON "ChoreInstance"("familyId", "dueDate");

CREATE INDEX IF NOT EXISTS "ChoreInstance_choreId_familyId_dueDate_idx"
  ON "ChoreInstance"("choreId", "familyId", "dueDate");

CREATE INDEX IF NOT EXISTS "ChoreCompletion_userId_status_completedAt_idx"
  ON "ChoreCompletion"("userId", "status", "completedAt");

CREATE INDEX IF NOT EXISTS "ChoreCompletion_choreInstanceId_userId_completedAt_idx"
  ON "ChoreCompletion"("choreInstanceId", "userId", "completedAt");

CREATE INDEX IF NOT EXISTS "Notification_userId_dismissedAt_readAt_idx"
  ON "Notification"("userId", "dismissedAt", "readAt");

CREATE INDEX IF NOT EXISTS "Notification_userId_dismissedAt_kind_createdAt_idx"
  ON "Notification"("userId", "dismissedAt", "kind", "createdAt");
