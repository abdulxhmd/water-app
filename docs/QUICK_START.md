# Quick Start

## Project Root
Run the app from:

```text
water-app/
```

Not from the workspace root.

## Prerequisites
- Node.js version compatible with Next.js 16
- npm
- access to the matching Supabase project

## Required Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Install

```bash
npm install
```

## Start Development

```bash
npm run dev
```

## Main Routes
- `/`
- `/login`
- `/today`
- `/week`
- `/month`
- `/settings`
- `/setup-passcode`

## What Must Exist In Supabase
Confirmed from code:
- auth users that can sign in with the synthesized email/password pattern
- `daily_water`
- `user_pairs`
- `weekly_results`
- `monthly_results`

Inferred but not locally verifiable:
- a unique conflict target on `daily_water(user_id, date)`
- policies allowing the browser client to read/write appropriate rows

## First Things To Check If The App Does Not Work
- verify you are in `water-app/`
- verify the two `NEXT_PUBLIC_SUPABASE_*` variables
- verify the current user exists in Supabase Auth
- verify a pair row exists in `user_pairs`
- verify the referenced tables exist with matching column names

## Current Limitations
- no automated setup script
- no database migration files
- no seed data
- no local mock backend
