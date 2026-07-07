# Water App

A shared hydration tracker built for two people. Log your daily water intake,
compare totals over the week, and roll weekly wins into a monthly result with
a reward for whoever's ahead.

Built with Next.js (App Router), React, TypeScript, Tailwind CSS v4, and
Supabase (Auth, Postgres, Storage, and an Edge Function for push
notifications).

## Getting Started

1. Copy `.env.example` to `.env.local` and fill in your Supabase project's
   URL, anon key, and VAPID public key (see `.env.example` for where to find
   each one).
2. Run the SQL in `supabase/migrations/0001_baseline_and_features.sql`
   against your Supabase project (SQL Editor, or the Supabase CLI) to create
   the required tables, RLS policies, and the `avatars` storage bucket.
3. Install dependencies and start the dev server:

   ```bash
   npm install
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

For the full schema reference, required Supabase setup (auth settings,
storage), and known constraints of this app, see [`docs/DATABASE.md`](docs/DATABASE.md)
and [`docs/SETUP.md`](docs/SETUP.md).

## Scripts

- `npm run dev` — start the development server
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — run ESLint
- `npm test` — run the test suite

## Project Structure

- `src/app/` — pages (login, setup-passcode, today, week, month, settings)
- `src/components/` — shared UI (`NavBar`, `AuthGate`, `UserAvatar`, `PageFooter`)
- `src/lib/` — Supabase client, auth/session hooks, date helpers, domain types
- `supabase/migrations/` — checked-in SQL schema and RLS policies
- `supabase/functions/send-push/` — Edge Function that sends web push notifications
