# Roadmap

## Grounded Near-Term Roadmap
This roadmap is based on gaps clearly visible in the repository, not on invented product plans.

## Phase 1: Stabilize Existing Flows
- Add route protection for authenticated pages.
- Redirect authenticated users away from `/login`.
- Redirect logged-out users away from `/today`, `/week`, `/month`, and `/settings`.
- Replace console/alert error handling with in-app messaging.
- Prevent negative or invalid water totals.
- Fix the weekly result creation path so weekly totals are actually computed for both users before insert.
- Verify date range logic against the intended locale and week/month definitions.

## Phase 2: Complete Existing UI Shells
- Implement setup passcode flow.
- Implement passcode update in settings.
- Implement reminder settings persistence.
- Implement avatar/profile editing or remove the affordances.
- Implement wish submission persistence and delivery or disable the CTA.
- Replace placeholder footer links with real destinations or remove them.

## Phase 3: Clean Up Architecture
- Extract duplicated helpers into shared modules.
- Introduce typed database models.
- Move Supabase queries out of route components into reusable data functions or hooks.
- Create shared header/footer/card primitives.
- Remove dead code such as unused helpers/constants if they remain unused.

## Phase 4: Operational Readiness
- Add `.env.example`.
- Stop committing `.env.local`.
- Add schema migrations or at least a checked-in SQL reference.
- Add tests for login, daily save, weekly result logic, and monthly winner logic.
- Document deployment and Supabase setup.

## Phase 5: Product Expansion
These are plausible extensions strongly suggested by current UI affordances, but not yet implemented:
- previous week navigation
- monthly history archive
- partner notifications
- reward/wish history
- richer analytics and streaks
- customizable daily goals
