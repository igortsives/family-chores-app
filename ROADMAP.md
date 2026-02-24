# Family Chores Roadmap

Last updated: 2026-02-24

This roadmap tracks planned product and engineering work.
For completed changes, see `CHANGELOG.md`.

## Prioritization Framework

- `P0`: immediate risk reduction or correctness/safety improvements
- `P1`: high user impact, moderate implementation effort
- `P2`: meaningful improvements that can follow core stabilization
- `P3`: longer-horizon or optional improvements

## Phase 1: Stabilize Core Experience (Next 1-2 Sprints)

1. `P0` Security hardening
   - Remove or strictly gate debug data exposure endpoint.
   - Add basic rate limiting for auth-sensitive and mutation-heavy APIs.

## Phase 2: Improve Planning and Accountability (2-4 Sprints)

1. `P1` Due times and overdue lifecycle
   - Use schedule time of day in chore instances.
   - Add statuses: upcoming, due soon, overdue.
2. `P1` Reminder delivery beyond in-app polling
   - Scheduled reminders (email/push-ready architecture).
   - Parent nudges for pending approvals; kid nudges for incomplete chores.
3. `P2` Reward governance controls
   - Reward catalog rules, weekly caps, cooldowns, request expiration.

## Phase 3: Advanced Family Workflow (4+ Sprints)

1. `P2` Advanced recurrence rules
   - Biweekly/monthly/custom schedule patterns.
2. `P2` Calendar/timeline workload view
   - Household-wide planning and capacity visibility.
3. `P2` Chore evidence attachments
   - Optional photo/video/comment evidence for submitted chores.
4. `P3` Weekly star computation jobs
   - Scheduled computation and period lock/finalization model.

## Backlog (Unscheduled)

1. Localization and time zone controls per family.
2. Multi-parent conflict handling (approval ownership/locking).
3. Audit log for admin actions (approvals, member status changes, star exchanges).
4. Data export for parent reporting.

## Suggested Execution Order

1. Complete Phase 1 before large UX expansions.
2. Start Phase 2 with due/overdue lifecycle before broader analytics extensions.
3. Defer Phase 3 until notification, approvals, and CI/security are stable.

## Roadmap Maintenance

- Update this file whenever scope/priorities change.
- Record completed work in `CHANGELOG.md`.
- Keep priorities aligned with user-facing reliability and parent/kid workflow clarity.
