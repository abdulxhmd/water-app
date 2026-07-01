# Architecture

## High-Level Architecture
The application is a client-rendered Next.js App Router application. All business logic currently executes in client components. Supabase is called directly from the browser for authentication and CRUD operations.

There is no backend layer inside this repository.

```mermaid
flowchart TD
    U["User in browser"] --> N["Next.js App Router UI"]
    N --> C["Client components"]
    C --> H["useUser hook"]
    C --> S["Supabase JS client"]
    H --> S
    S --> A["Supabase Auth"]
    S --> D["Supabase Postgres tables"]
```

## Runtime Boundaries

### Presentation Layer
- `src/app/layout.tsx`
- `src/app/globals.css`
- page files under `src/app/**/page.tsx`
- `src/components/NavBar.tsx`

### Client-Side Data/Session Layer
- `src/lib/supabase.ts`
- `src/lib/useUser.ts`
- `src/lib/auth.ts`
- `src/components/AuthBootstrap.tsx`

### External Platform
- Supabase Auth
- Supabase Postgres

## Route Architecture

```mermaid
flowchart LR
    Root["/"] --> Login["Renders login page component directly"]
    LoginRoute["/login"] --> LoginPage["Login page"]
    Today["/today"] --> TodayPage["Daily tracking"]
    Week["/week"] --> WeekPage["Weekly recap and winner"]
    Month["/month"] --> MonthPage["Monthly recap and reward"]
    Settings["/settings"] --> SettingsPage["Settings and logout"]
    Setup["/setup-passcode"] --> SetupPage["Presentational setup flow"]
```

## Layout Composition

```mermaid
flowchart TD
    RootLayout["RootLayout"] --> AuthBootstrap["AuthBootstrap"]
    RootLayout --> PageSlot["Page content"]
    RootLayout --> NavBar["NavBar"]
```

Notes:
- `NavBar` is always rendered, including on `/login`.
- The login page visually occupies the full screen, so the persistent nav may be unintentionally present beneath it.
- There is no route group or separate authenticated shell.

## State Management
State management is fully local and component-scoped.

Patterns in use:
- `useState` for page-local UI and fetched data.
- `useEffect` for initial data fetches and time-based updates.
- No context providers.
- No Redux, Zustand, Jotai, TanStack Query, SWR, or React context state layer.
- No server state cache abstraction.

### Today Page State
- `water`
- `customAmount`
- `showCustomInput`
- `saved`
- `now`
- `user/loading` from `useUser`

### Week Page State
- `weekEntries`
- `weeklyTotals`
- `weeklyWinnerState`
- `partnerId`
- `user/loading` from `useUser`

### Month Page State
- `weeklyResults`
- `monthlyResult`
- `partnerId`
- `user/loading` from `useUser`

### Navigation State
- `pathname`
- scroll-driven visibility state in `NavBar`

## Authentication Architecture
Authentication is fully client-side through Supabase Auth.

Flow:
1. User enters a name and four PIN digits.
2. The login page normalizes the name to lowercase.
3. The app synthesizes credentials:
   - `email = ${normalizedName}@water.app`
   - `password = water-${pin}-lock`
4. The app calls `supabase.auth.signInWithPassword`.
5. On success, the router pushes to `/today`.
6. Session lookups later rely on `supabase.auth.getUser()`.

```mermaid
sequenceDiagram
    participant User
    participant LoginPage
    participant SupabaseAuth
    participant TodayPage

    User->>LoginPage: Enter name + 4-digit PIN
    LoginPage->>LoginPage: Build synthetic email/password
    LoginPage->>SupabaseAuth: signInWithPassword()
    SupabaseAuth-->>LoginPage: session or error
    LoginPage->>TodayPage: router.push('/today')
```

Important limitations:
- No sign-up flow exists.
- No forgot-passcode flow exists.
- No route guard exists.
- `useUser()` only fetches once on mount and does not subscribe to auth changes.
- `AuthBootstrap` subscribes to auth changes but only logs the user ID to the console.

## Data Flow By Screen

### Today
```mermaid
flowchart TD
    T["Today page mount"] --> U["useUser()"]
    U --> L["Load current day's daily_water row"]
    L --> W["Render water total"]
    W --> Save["Save button"]
    Save --> Upsert["Upsert daily_water by user_id + date"]
```

### Week
```mermaid
flowchart TD
    W["Week page mount"] --> U["useUser()"]
    U --> P["Load pair from user_pairs"]
    U --> D["Load current user's daily_water entries for week"]
    P --> R["If week ended, load or create weekly_results"]
    D --> V["Build displayed week day list"]
    R --> O["Show locked result or pending state"]
```

### Month
```mermaid
flowchart TD
    M["Month page mount"] --> U["useUser()"]
    U --> P["Load pair from user_pairs"]
    P --> W["Load weekly_results for current month"]
    W --> C["Compute win counts"]
    C --> R["If month ended, load or create monthly_results"]
    R --> Reward["Enable reward UI only for winner"]
```

## Database Access Pattern
The code uses direct table access from page components. There is no repository layer, no service layer, and no typed query abstraction.

Observed tables:
- `daily_water`
- `user_pairs`
- `weekly_results`
- `monthly_results`

## Build and Tooling Architecture
- Next.js `16.1.6`
- React `19.2.3`
- TypeScript strict mode enabled
- Tailwind CSS v4 through `@tailwindcss/postcss`
- React Compiler enabled in `next.config.ts`
- ESLint uses `eslint-config-next` core web vitals and TypeScript presets

## Notable Architectural Risks
- Business logic is duplicated across pages.
- Date handling is client-local and may drift across time zones.
- Page components mix rendering, copy, data access, calculations, and persistence.
- Hard-coded labels and static placeholder values make the UI look more complete than the implementation actually is.
- Committed `.env.local` indicates secrets/config hygiene issues.
