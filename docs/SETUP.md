# Setup & Deployment Guide

This app needs a Supabase project (Auth + Postgres + Storage) and, for push
reminders, a deployed Edge Function. There is no other backend.

## 1. Create a Supabase project

Create a project at [supabase.com](https://supabase.com) if you don't have
one, then grab from **Project Settings → API**:
- Project URL
- `anon` public API key

## 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the two values above, plus a
VAPID public key (step 5).

## 3. Run the database migration

Open the Supabase SQL Editor and run
[`supabase/migrations/0001_baseline_and_features.sql`](../supabase/migrations/0001_baseline_and_features.sql)
in full. It creates every table, enables RLS with the policies this app
relies on, and creates the public `avatars` storage bucket. See
[`docs/DATABASE.md`](DATABASE.md) for what each table is for.

The migration is idempotent — safe to re-run later if you pull in a newer
version of it.

## 4. Disable email confirmation

This app authenticates with synthetic `name@water.app` addresses (see
`docs/API.md`) that can't receive a real confirmation email. In **Authentication
→ Providers → Email**, turn **Confirm email** off, otherwise accounts created
via `/setup-passcode` will be stuck unconfirmed and unable to log in.

## 5. Set up web push (optional)

Reminders use the Web Push protocol (RFC 8291/8292) via two Edge Functions
that share `supabase/functions/_shared/push.ts`, which wraps the `npm:web-push`
package for VAPID signing and payload encryption:

- `send-push` — sends one push on demand (wish notifications, the "Remind
  partner" button on `/today`).
- `daily-reminder` — sends a push to every user with `daily_reminder` enabled.
  Meant to be triggered on a schedule (step 4 below), not called from the app.

1. Generate a VAPID key pair, e.g. `npx web-push generate-vapid-keys`.
2. Put the public key in `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (`.env.local`, and in
   your hosting provider's env vars for production).
3. Deploy both functions: `supabase functions deploy send-push` and
   `supabase functions deploy daily-reminder` (requires the Supabase CLI
   linked to your project).
4. Set each function's secrets (`supabase secrets set ...` — secrets are
   shared across functions in a project, so this only needs doing once):
   - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` — the pair from step 1
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — from Project Settings → API
5. Schedule `daily-reminder` in the Supabase Dashboard under
   **Integrations → Cron Jobs**: create a job that sends an HTTP POST to
   `https://<project-ref>.functions.supabase.co/daily-reminder` (with an
   `Authorization: Bearer <anon-or-service-role-key>` header) once a day at
   whatever local time makes sense for the two of you. This is a manual,
   per-project dashboard step rather than something in the SQL migration, so
   no key ever needs to be committed to the repo.

If you skip this, the app still works — reminder toggles, the "Remind
partner" button, and wish submission just won't trigger a push notification
(the underlying save/submission never depends on push success; see
`usePushNotifications` and the `send-push` calls in `src/app/today/page.tsx`
and `src/app/month/page.tsx`, both of which treat notification failures as
non-fatal).

## 6. Pair the two users

There is no in-app flow to create a pairing. After both people have created
an account once via `/setup-passcode`, find their two `auth.users` ids
(Authentication → Users in the dashboard) and insert one row:

```sql
insert into public.user_pairs (user_a_id, user_b_id)
values ('<user-a-uuid>', '<user-b-uuid>');
```

Until this row exists, each user only sees their own data — the week/month
pages show an explicit "no partner paired yet" message rather than silently
comparing against nothing.

## 7. Run locally

```bash
npm install
npm run dev
```

## 8. Deploy

Any Next.js host works (Vercel is the path of least resistance for the App
Router). Set the same three `NEXT_PUBLIC_*` environment variables from
`.env.example` in the host's project settings, then build with `npm run
build` / start with `npm run start`.
