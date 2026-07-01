# AI Rules

## Purpose
This file is for future AI assistants working in this codebase. It records the safest assumptions supported by the current repository.

## Source Of Truth Rules
- Treat `water-app/` as the real application root.
- Treat workspace-root package files as separate scaffolding unless the user explicitly wants them changed.
- Do not assume any server backend exists in this repo.
- Do not assume database schema beyond what query usage proves.
- Mark schema details as inferred unless they appear in code or checked-in SQL.

## Product Rules
- The app is a two-person hydration tracker with a relational tone.
- Daily logging is real.
- Weekly and monthly comparison are partially real and partially placeholder UI.
- Settings and passcode setup screens are not fully implemented.

## Architecture Rules
- All current app behavior is client-side.
- Supabase is called directly from browser code.
- There is no centralized state store.
- There is no internal API layer.
- There are no tests to use as behavioral truth.

## Editing Rules
- Preserve the existing App Router structure unless intentionally refactoring.
- Keep visual changes aligned with the pastel hydration aesthetic.
- Avoid inventing backend endpoints or schema files that do not exist.
- If adding database logic, either infer carefully from current queries or ask for schema confirmation.
- If touching auth, remember that current login uses synthesized email/password credentials from name and PIN.

## Known Sharp Edges
- `useUser()` does not subscribe to auth changes.
- `AuthBootstrap` only logs auth events.
- hard-coded participant names appear in multiple pages
- `.env.local` is committed
- `.next` and `node_modules` exist inside the app directory
- the week page includes significant hard-coded analytics display values

## Safe Assumptions
- The required environment variables are the two public Supabase values.
- The primary routes are `/login`, `/today`, `/week`, `/month`, `/settings`, and `/setup-passcode`.
- The database tables used by the UI are `daily_water`, `user_pairs`, `weekly_results`, and `monthly_results`.

## Unsafe Assumptions
- Do not assume RLS policies are correct.
- Do not assume the monthly wish feature works.
- Do not assume settings controls persist.
- Do not assume the root route is protected or redirecting.
- Do not assume weekly/monthly summary numbers in the UI are fully data-driven.
