# TODO

## Confirmed Technical Debt
- Metadata still says `Create Next App`.
- `README.md` is still the default scaffold.
- `useUser()` uses `any`.
- `getUserNames()` is duplicated across pages.
- Layout loads Geist but `body` still uses Arial/Helvetica.
- `AuthBootstrap` subscribes to auth changes but only logs to console.
- `participants.ts` is unused.
- `auth.ts` is unused.
- `public/*.svg` are unused starter assets.
- `water-app-source.zip` duplicates source inside the repo.
- `.env.local` is committed.
- The repo contains generated directories like `.next` and installed `node_modules` inside the app folder.

## Confirmed Functional Gaps
- No sign-up or onboarding flow.
- No forgot-passcode flow.
- No route guarding.
- No auth-aware redirects on protected routes.
- No persistence for settings controls.
- No persistence for monthly wish submission.
- No partner notification system.
- No previous/next week navigation logic.
- No previous monthly winners view.
- No loading/skeleton states for async fetches.

## Confirmed Logic Risks
- Today page can subtract below zero.
- Today page saves total only when user clicks save, not automatically.
- Week page hard-codes visible recap labels like `Sunday, October 24th` and `Week 42`.
- Week page uses many hard-coded totals/percentages in comparison cards and charts.
- Week page may fail to create a new weekly result because `weeklyTotals` is never computed from raw data before insert.
- Month page winner card and reward copy use hard-coded month naming like `October Champion`.
- Month page reward UI enables the button only by winner status but does not submit anything.

## Confirmed Documentation Gaps
- No project-specific README
- No schema docs
- No RLS/policy docs
- No onboarding doc
- No deployment doc
- No test strategy doc

## Cleanup Candidates
- remove unused assets if not needed
- remove archived source zip if not intentionally retained
- remove dead helper files if no future use is planned
- consolidate duplicate UI sections into shared components
