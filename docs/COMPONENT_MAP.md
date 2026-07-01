# Component Map

## Reusable Components

### `src/components/NavBar.tsx`
Purpose:
- global bottom navigation across main app sections

Inputs:
- none via props

Internal dependencies:
- `usePathname()`
- scroll listeners

Behavior:
- highlights the active route
- auto-hides after 3 seconds of non-bottom scrolling
- stays visible at the bottom of the page

Routes linked:
- `/today`
- `/week`
- `/month`
- `/settings`

Reusability:
- medium
- tightly coupled to existing route set and visual language

### `src/components/AuthBootstrap.tsx`
Purpose:
- subscribe to Supabase auth state changes

Inputs:
- none

Behavior:
- logs `session?.user.id` on auth changes
- performs no redirect, no store update, and no cache invalidation

Reusability:
- low in current form

## App Shell Components

### `src/app/layout.tsx`
Purpose:
- global HTML shell
- loads fonts, Material Symbols, global CSS, auth bootstrap, and navigation

Composition:
- `<AuthBootstrap />`
- children
- `<NavBar />`

## Route Components

### `src/app/page.tsx`
Purpose:
- root route entry point

Behavior:
- renders the login page component directly
- does not redirect to `/login`

### `src/app/login/page.tsx`
Purpose:
- user login using name + 4-digit PIN

Local concerns:
- form state
- PIN focus management
- synthesized credential generation
- Supabase sign-in
- routing to `/today`

### `src/app/today/page.tsx`
Purpose:
- daily tracking screen

Local concerns:
- load today's water amount
- display progress to 4000 ml
- add/subtract water
- save via upsert
- greeting and current time display

Helper functions defined in file:
- `getHydrationLabel`
- `getUserNames`
- `formatDateTime`

### `src/app/week/page.tsx`
Purpose:
- weekly recap and result persistence

Local concerns:
- load user pair
- load current-week entries
- compute week day list
- determine locked/unlocked state
- load or insert weekly result

Helper functions defined in file:
- `getWeekRange`
- `buildWeekDays`
- `getWeeklyWinner`
- `getWeeklyResult`
- `getUserNames`
- `BlurWrapper`

### `src/app/month/page.tsx`
Purpose:
- monthly recap and reward screen

Local concerns:
- load user pair
- load weekly results for current month
- compute win totals
- load or insert monthly result
- gate reward UI to current winner after month end

Helper functions defined in file:
- `getMonthRange`
- `getUserNames`

### `src/app/settings/page.tsx`
Purpose:
- settings shell and logout

Implemented behavior:
- logout button only

Presentational only:
- avatar change
- mood/persona buttons
- reminder toggles
- passcode update form

### `src/app/setup-passcode/page.tsx`
Purpose:
- presentational passcode setup screen

Implemented behavior:
- none

## Shared Library Modules

### `src/lib/supabase.ts`
Purpose:
- create and export the Supabase client

Dependencies:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### `src/lib/useUser.ts`
Purpose:
- fetch the current Supabase user once on mount

Returned shape:
- `{ user, loading }`

Limitations:
- `user` typed as `any`
- no auth-state subscription

### `src/lib/auth.ts`
Purpose:
- helper for fetching the current user directly

Usage:
- not imported anywhere in the current app

### `src/lib/participants.ts`
Purpose:
- exports `PARTNER_USER_ID`

Usage:
- not imported anywhere in the current app

## Reuse Observations
- The app visually reuses patterns, but not much code.
- Helper functions like `getUserNames` are duplicated in multiple pages rather than shared.
- Header, footer, avatar shell, and settings-link patterns are repeated manually across pages.
- Data-access code is page-specific and repeated.

## Recommended Consolidation Targets
These are observations from current duplication, not changes already present:
- shared page header component
- shared app footer component
- shared user-name resolution utility
- shared date range utilities
- shared table query helpers
- shared loading/error UI
