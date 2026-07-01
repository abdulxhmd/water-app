# API

## Overview
No internal HTTP API exists in this repository.

There are:
- no `src/app/api/*` route handlers
- no Express/Fastify/Hono server
- no server actions
- no RPC layer

The application talks directly to Supabase from the browser.

## External API Surface
All data access uses the Supabase JavaScript client:
- `supabase.auth.*`
- `supabase.from(...).*`

## Authentication Calls

### Sign In
Location:
- `src/app/login/page.tsx`

Operation:
- `supabase.auth.signInWithPassword({ email, password })`

Credential construction:
- email is synthesized from the entered name
- password is synthesized from the four PIN digits

Confirmed format:
- email: `${normalizedName}@water.app`
- password: `water-${pin}-lock`

### Current User Lookup
Locations:
- `src/lib/useUser.ts`
- `src/lib/auth.ts`

Operation:
- `supabase.auth.getUser()`

### Sign Out
Location:
- `src/app/settings/page.tsx`

Operation:
- `supabase.auth.signOut()`

### Auth State Subscription
Location:
- `src/components/AuthBootstrap.tsx`

Operation:
- `supabase.auth.onAuthStateChange(...)`

Current effect:
- logs session user ID only

## Database Calls By Table

### `daily_water`
Locations:
- `src/app/today/page.tsx`
- `src/app/week/page.tsx`

Observed operations:
- select today's row by `user_id` and `date`
- upsert today's row by `user_id,date`
- select week range rows by `user_id`, `startDate`, `endDate`

### `user_pairs`
Locations:
- `src/app/week/page.tsx`
- `src/app/month/page.tsx`

Observed operations:
- select pair where the current user is either `user_a_id` or `user_b_id`

### `weekly_results`
Location:
- `src/app/week/page.tsx`
- `src/app/month/page.tsx`

Observed operations:
- select existing weekly result by week range and pair IDs
- insert weekly result if week has ended and no row exists
- select weekly results for the current month

### `monthly_results`
Location:
- `src/app/month/page.tsx`

Observed operations:
- select existing monthly result by month range and pair IDs
- insert monthly result if month has ended and no row exists

## Missing API Features
- no typed API wrapper
- no centralized retry/error policy
- no request logging
- no validation layer
- no optimistic sync strategy
- no background refresh
- no notification endpoint for reward wishes
