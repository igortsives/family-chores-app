# Changelog

All notable completed changes are documented in this file.

## 2026-02-24

### CI / Quality
- Expanded CI quality gates to run production build validation in GitHub Actions (`npm run build`) in addition to lint, unit tests, and E2E.

### Approvals
- Added inline parent comment management in approvals history:
  - add when missing
  - edit existing comments
  - remove comments
- Introduced compact icon-based controls for comment view/edit/save/cancel/remove in the history modal.

### Notifications
- Refined notification lifecycle behavior:
  - retained persistent read/unread + dismiss model
  - removed auto-mark-read retention behavior for old unread messages
  - kept unread count filtering that excludes stale unread non-reminder updates
  - hard-delete window for non-reminder updates set to 30 days
- Simplified kid notification UX:
  - grouped by `Recent` (last 3 days) and `Older`
  - added tab-based switching between `Recent` and `Older`

### Parent Modals
- Added top-right close controls to:
  - Edit chore modal
  - Manage member modal

### Kid Chores UI
- Added a border-integrated month/year legend to the weekly day strip.
- Improved legend spacing and visual integration without increasing strip height.

## 2026-02-20

### Family Members / Avatars
- Added optional member avatar storage and migration support.
- Added avatar upload/edit in Family management.
- Reused member avatars in chore assignment displays and selectors.

### Scoring / Leaderboard
- Replaced rank-by-coins behavior with normalized hybrid score ranking.
- Implemented weighted weekly score formula:
  - completion: 70%
  - consistency: 20%
  - streak: 10%
- Kept coins visible for motivation while removing coin bias from ranking.

### Stars
- Added cumulative weekly-score carryover toward stars.
- Added next-star progress previews in kid and parent views.
- Added star-earned notification support when a new star is awarded.

### Parent Analytics / Admin UX
- Added Family Stats page/API consolidating scores, coins, stars, completion, consistency, and rank.
- Renamed Parent admin to Chores.
- Modernized Chores and Family management pages with compact, responsive, Material-style controls.
- Added icon-triggered filter/search headers and row-tap manage flows.

### Kid UX
- Added weekly day strip with future-day lockout.
- Added in-page leaderboard summary with modal details.
- Added kid header counters for weekly coins and total stars earned.

## 2026-02-19

### Approvals
- Rejection reasons implemented:
  - parent rejection requires a reason
  - reason stored on completion records
  - reason shown to kids in chores
- Rejection emits kid-facing notification.

### Notifications
- Added database-backed persistent notification feed.
- Added API actions for read/unread and dismiss lifecycle.
- Added persistent update notifications for approval and star exchange decisions.

### Verification
- `npm run lint` passed.
- `npm run test:run` passed.
- `npm run build` passed.
- Authenticated E2E smoke path validated (`E2E_FEATURE_TEST_OK`):
  - reject with reason
  - kid sees reason
  - notification unread -> read -> dismissed lifecycle
