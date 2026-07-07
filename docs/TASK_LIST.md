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
- [x] Prevent invalid daily water totals, especially negative values. (Clamped to `[0, 20000]` ml, single entries capped at 5000 ml, with inline validation feedback.)
- [x] Review and correct date/week/month boundary logic so it matches the intended behavior. (Fixed a real UTC-vs-local date parsing bug affecting month names/week labels in negative-UTC-offset timezones; centralized in `src/lib/date.ts`; removed a misleading "Unlocks Sunday at 8:00 PM" banner that didn't match the real Monday-unlock logic.)
- [x] Fix weekly result generation so both users' totals are actually computed from real data. (Verified: already computed from real `daily_water` rows, not hard-coded.)
- [x] Remove hard-coded week labels, summary values, and comparison stats from the week page. (Removed fake "+5%/-2% vs last week", fake "Perfect Week!"/"Keep it up!" badges, fake "You both did wonderful" banner, and a fake preview lock-toggle that could show a false "Results Locked" overlay; replaced with real computed values.)
- [x] Replace hard-coded month naming and monthly summary placeholders with real computed values. (Month name now derived correctly from local-time date parsing; tie-week count surfaced; dead "View previous monthly winners" link removed.)

## Phase 2: Complete Existing Feature Shells
- [x] Implement persistent settings for reminder toggles. (Already implemented via `user_preferences`; verified working.)
- [x] Implement passcode update behavior in settings. (Already implemented via `supabase.auth.updateUser`; verified working.)
- [x] Decide whether avatar/profile editing will be real or removed, then implement that direction. (Decided: implement. Real upload to Supabase Storage + `user_preferences.avatar_url`/`theme`, wired into every page via a shared `UserAvatar` component.)
- [x] Implement the monthly wish submission flow or disable/remove the inactive UI. (Decided: implement. New `wishes` table + RLS; winner submits, partner sees it read-only and gets a best-effort push notification via the existing `send-push` edge function.)
- [x] Implement the setup passcode page or remove it from the flow until needed. (Decided: implement as a real first-time sign-up flow via `supabase.auth.signUp`; linked from the login page; logged-in users are redirected away from it like `/login`.)
- [x] Replace placeholder footer links with real destinations or remove them. (Decided: remove. Also removed the dead "I forgot my key" `href="#"` link on the login page in favor of a real link to the new setup-passcode flow, and a dead decorative "settings" gear button on the Settings header that had no handler.)

## Phase 3: Improve UX and Feedback
- [x] Replace `alert(...)` error handling with inline or component-based feedback. (All 4 remaining `alert()` calls replaced with inline error text: login validation, and best-effort weekly/monthly result save failures.)
- [x] Add loading states for login, daily load/save, weekly load, and monthly load. (Login already had one via `isSubmitting`. Added `isLoadingToday`, `isLoadingWeek`, and `isLoadingWeeklyResults` with visible loading copy/skeletons.)
- [x] Add empty states where data may be missing, especially pair data and result history. (Week and month pages now show an explicit "no partner paired yet" message via a shared `usePartner` hook's `isLoaded` flag, instead of silently showing zeros.)
- [x] Review mobile layout polish for the main screens after the logic is stabilized. (Verified with real Playwright screenshots at 375px/390px and 1280px against a live signed-up test account — Today/Week/Month/Settings all render cleanly at both widths, no overlap/overflow. Caught and fixed one real bug in the process: the "You"/"Partner" fallback display name broke grammar in possessive/verb-agreement contexts, e.g. "YOU'S INTAKE" and "You wins: 0" — added `getPossessive()` in `src/lib/users.ts` and reworded the month page's summary line to sidestep subject-verb agreement entirely.)

## Phase 4: Refactor and Consolidate
- [x] Extract duplicated helper logic such as participant naming into shared utilities. (`getUserNames` centralized in `src/lib/users.ts`; date helpers centralized in `src/lib/date.ts`, fixing a UTC-parsing bug in the process; weekly/monthly result mapping and credential synthesis also extracted — see Phase 4 typed-models note below.)
- [x] Create typed models for the Supabase-backed data used by the app. (Hand-written row types in `src/lib/types.ts`, replacing duplicated/slightly-inconsistent inline type definitions across the week/month pages. A full generated `Database` generic for `createClient<Database>()` was attempted but reverted — this supabase-js version expects an internal schema marker shape that only `supabase gen types typescript` against the live project can produce reliably; documented in `src/lib/supabase.ts`.)
- [x] Move repeated Supabase query logic into reusable helpers or hooks where it improves clarity. (Partner-pair lookup extracted into `src/lib/usePartner.ts`; profile/avatar lookup into `src/lib/useProfile.ts`; pure result-mapping logic into `src/lib/weeklyResult.ts` and `src/lib/monthlyResult.ts`; credential synthesis into `src/lib/credentials.ts`.)
- [x] Consolidate repeated page header/footer/shell UI into reusable components. (Shared `PageFooter` and `UserAvatar` components now used by all 4 authenticated pages.)
- [x] Remove unused files/constants/assets that are no longer part of the app direction. (Deleted `src/lib/participants.ts`, `src/lib/auth.ts` (both confirmed unreferenced), the 5 default Next.js starter SVGs in `public/`, and the stale `water-app-source.zip` full-repo archive. Left `googlestitchfiles/stitch-login.html` alone — it reads as an intentional design-reference prototype, not dead app code; worth a deliberate decision rather than deleting in this pass.)

## Phase 5: Project Hygiene and Readiness
- [x] Replace default app metadata and starter README content with project-specific content. (`layout.tsx` metadata and `README.md` rewritten to describe the actual app, setup, and structure.)
- [x] Add `.env.example` and stop relying on a committed `.env.local`. (`.env.local` was never actually committed to this repo despite stale docs claiming otherwise — `.gitignore` already excluded `.env*`. Added `.env.example` with an explicit `!.env.example` exception so it's the one env file that *is* tracked.)
- [x] Document the required Supabase tables and expected setup more concretely. (`docs/DATABASE.md` rewritten against the real schema/RLS in the migration file; new `docs/SETUP.md` walks through project creation, running the migration, auth settings, push setup, and pairing the two users.)
- [x] Add tests for the most fragile logic: login flow, daily save, weekly result logic, and monthly result logic. (Added Vitest (`npm test`). Extracted the pure logic underneath each of these into `src/lib/{water,credentials,weeklyResult,monthlyResult,date}.ts` and unit-tested it — 42 tests covering water clamping, credential synthesis, weekly/monthly winner + result-row mapping, and the date/week/month boundary math fixed in Phase 1.)
- [x] Add a basic deployment/setup guide for future contributors. (`docs/SETUP.md`.)

## Phase 6: Reminder Feature Completion (post-audit follow-up)
Phase 2's "persistent settings for reminder toggles" item turned out to only
cover storage and push-permission plumbing — nothing ever actually sent a
reminder, and the shipped `send-push` Edge Function used a hand-rolled
VAPID/encryption implementation that could never succeed (raw-format EC
private key import is not valid per the Web Crypto spec, and the push
payload was sent unencrypted despite claiming `aes128gcm` encoding). Fixed
as part of implementing the two reminder settings for real:
- [x] Rewrite `send-push` on top of `npm:web-push` (correct VAPID JWT +
      RFC 8291 payload encryption) instead of the broken hand-rolled crypto;
      extract the shared logic into `supabase/functions/_shared/push.ts`.
      Regenerated a valid VAPID key pair (the checked-in `.env.local` one
      decoded to the wrong byte length and could never have worked).
- [x] Implement "Allow partner reminders" as a manual nudge: a "Remind
      {partner}" button on `/today`, gated on the partner's own
      `partner_reminder` toggle (checked via the existing partner-read RLS
      policy on `user_preferences`).
- [x] Implement the "Daily reminder" toggle as a real scheduled push: new
      `daily-reminder` Edge Function that pushes to everyone opted in,
      unconditionally, meant to be triggered by a Supabase Dashboard Cron Job
      (documented in `docs/SETUP.md` rather than checked into SQL, so no
      secret needs to live in the repo).
- [x] Add a "Forgot to log yesterday?" editor on `/today` so a missed entry
      can still be corrected accurately after midnight, instead of only ever
      being able to edit the current day. New `getPreviousLocalDate` helper
      in `src/lib/date.ts`. Note: if the previous day fell in a week that's
      already ended *and* someone already opened `/week` since midnight, that
      week's `weekly_results` row may already be locked in with the old
      total — this is a narrow pre-existing edge case in the week-locking
      design, not something this change attempts to solve.

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


