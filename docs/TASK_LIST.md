# Task List

This is the working execution plan for improving the app step by step.

Status key:
- `[ ]` not started
- `[~]` in progress
- `[x]` completed

## Phase 1: Fix Core App Logic
- [x] Add auth-aware route protection for `/today`, `/week`, `/month`, and `/settings`.
- [x] Redirect authenticated users away from `/login`.
- [x] Replace the current `AuthBootstrap` console-only behavior with real session handling support.
- [ ] Prevent invalid daily water totals, especially negative values.
- [ ] Review and correct date/week/month boundary logic so it matches the intended behavior.
- [ ] Fix weekly result generation so both users' totals are actually computed from real data.
- [ ] Remove hard-coded week labels, summary values, and comparison stats from the week page.
- [ ] Replace hard-coded month naming and monthly summary placeholders with real computed values.

## Phase 2: Complete Existing Feature Shells
- [ ] Implement persistent settings for reminder toggles.
- [ ] Implement passcode update behavior in settings.
- [ ] Decide whether avatar/profile editing will be real or removed, then implement that direction.
- [ ] Implement the monthly wish submission flow or disable/remove the inactive UI.
- [ ] Implement the setup passcode page or remove it from the flow until needed.
- [ ] Replace placeholder footer links with real destinations or remove them.

## Phase 3: Improve UX and Feedback
- [ ] Replace `alert(...)` error handling with inline or component-based feedback.
- [ ] Add loading states for login, daily load/save, weekly load, and monthly load.
- [ ] Add empty states where data may be missing, especially pair data and result history.
- [ ] Review mobile layout polish for the main screens after the logic is stabilized.

## Phase 4: Refactor and Consolidate
- [ ] Extract duplicated helper logic such as participant naming into shared utilities.
- [ ] Create typed models for the Supabase-backed data used by the app.
- [ ] Move repeated Supabase query logic into reusable helpers or hooks where it improves clarity.
- [ ] Consolidate repeated page header/footer/shell UI into reusable components.
- [ ] Remove unused files/constants/assets that are no longer part of the app direction.

## Phase 5: Project Hygiene and Readiness
- [ ] Replace default app metadata and starter README content with project-specific content.
- [ ] Add `.env.example` and stop relying on a committed `.env.local`.
- [ ] Document the required Supabase tables and expected setup more concretely.
- [ ] Add tests for the most fragile logic: login flow, daily save, weekly result logic, and monthly result logic.
- [ ] Add a basic deployment/setup guide for future contributors.

## Recommended Execution Order
If we work one by one, this is the best order:

1. Route protection and auth redirects
2. Daily water validation and save behavior
3. Weekly result calculation and removal of hard-coded weekly values
4. Monthly result cleanup and removal of hard-coded monthly values
5. Error/loading states
6. Settings persistence
7. Passcode flow
8. Monthly wish feature
9. Shared utility/component refactor
10. Project hygiene, env cleanup, and tests

## Suggested First Task
Start with:

`Add route protection and auth redirects so logged-out users cannot access app pages and logged-in users do not stay on the login screen.`
