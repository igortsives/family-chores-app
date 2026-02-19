# Family Chores Roadmap

Last updated: 2026-02-19

This roadmap captures planned product and engineering enhancements so the team can prioritize work consistently over time.

## Prioritization Framework

- `P0`: immediate risk reduction or correctness/safety improvements
- `P1`: high user impact, moderate implementation effort
- `P2`: meaningful improvements that can follow core stabilization
- `P3`: longer-horizon or optional improvements

## Phase 1: Stabilize Core Experience (Next 1-2 Sprints)

1. `P0` Security hardening
   - Remove or strictly gate debug data exposure endpoint.
   - Add basic rate limiting for auth-sensitive and mutation-heavy APIs.
2. `P0` CI quality gate expansion
   - Extend GitHub Actions to run `npm run lint` and `npm run build` in addition to unit tests.
3. `P1` Rejection reasons in approvals [DONE 2026-02-19]
   - Allow parents to add a rejection note.
   - Show that note to kids in chores + notifications.
4. `P1` Persistent notifications [DONE 2026-02-19]
   - Add durable notifications (read/unread, dismiss) instead of fetch-time computed-only list.

## Completed (2026-02-19)

1. Rejection reasons in approvals
   - Parent rejection now requires a reason.
   - Reason is stored on completion records and displayed in kid chores.
   - Rejection emits a kid-facing notification.
2. Persistent notifications
   - Added database-backed notification feed with read/unread and dismiss state.
   - Added API actions to mark read and dismiss notifications.
   - Added persistent update notifications for approval and star exchange decisions.
3. Verification run
   - `npm run lint` passed.
   - `npm run test:run` passed.
   - `npm run build` passed.
   - Authenticated end-to-end smoke test passed (`E2E_FEATURE_TEST_OK`), including:
     - reject with reason,
     - kid sees reason,
     - notification unread -> read -> dismissed lifecycle.

## Phase 2: Improve Planning and Accountability (2-4 Sprints)

1. `P1` Due times and overdue lifecycle
   - Use schedule time of day in chore instances.
   - Add statuses: upcoming, due soon, overdue.
2. `P1` Reminder delivery beyond in-app polling
   - Scheduled reminders (email/push-ready architecture).
   - Parent nudges for pending approvals; kid nudges for incomplete chores.
3. `P2` Parent analytics dashboard
   - Completion rates, rejection trends, overdue metrics, weekly comparisons.
4. `P2` Reward governance controls
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

1. Ship Phase 1 entirely before large UX expansions.
2. Start Phase 2 with due/overdue lifecycle before analytics.
3. Defer Phase 3 until notification, approvals, and CI/security are stable.

## Roadmap Maintenance

- Update this file whenever scope/priorities change.
- Add completed items to a changelog section (or mark with a completion date).
- Keep priorities aligned with user-facing reliability and parent/kid workflow clarity.
