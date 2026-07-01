# Master Summary

This repository contains a small Next.js 16 App Router app located in `water-app/`. The workspace root is not the actual app root; it also contains a separate package manifest and staged dependency tree, but the runnable product code, env file, nested Git metadata, and source all live inside `water-app/`.

The product is a two-person hydration tracker with a soft, relationship-oriented UI. Its implemented feature set is: login via a synthesized Supabase email/password, daily water tracking and save, weekly recap loading, monthly recap loading, and logout. The app's emotional framing is confirmed by the copy: hydration is presented as a shared ritual rather than a generic utility app.

Architecture is simple and entirely client-side. There are no API routes, server actions, middleware, tests, migrations, or backend services in the repo. React client components call Supabase directly from the browser using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. All data fetching is done with `useEffect`, and all state is local `useState`; there is no global store or query library.

Key routes:
- `/` renders the login page component directly.
- `/login` is the explicit login route.
- `/today` is the main daily tracker.
- `/week` is the weekly recap/result page.
- `/month` is the monthly recap/reward page.
- `/settings` contains logout and mostly presentational controls.
- `/setup-passcode` is a presentational screen with no logic.

Shared modules are minimal:
- `src/lib/supabase.ts` creates the client.
- `src/lib/useUser.ts` fetches the current user once on mount.
- `src/lib/auth.ts` is an unused helper for `getUser()`.
- `src/components/AuthBootstrap.tsx` subscribes to auth changes but only logs to console.
- `src/components/NavBar.tsx` is the only meaningful reusable UI component.

Authentication is implemented through a nonstandard pattern. On login, the entered name is lowercased and turned into `${name}@water.app`, and the entered four-digit PIN becomes `water-${pin}-lock`. The page then calls `supabase.auth.signInWithPassword()`. There is no sign-up, forgot-passcode flow, route protection, or auth redirect layer.

Supabase tables referenced in code are:
- `daily_water`
- `user_pairs`
- `weekly_results`
- `monthly_results`

Schema details are inferred from query usage because no SQL or generated types are committed. `daily_water` clearly uses `user_id`, `date`, and `water_ml`, and the code upserts with conflict target `user_id,date`, implying a unique constraint. `user_pairs` uses `user_a_id` and `user_b_id`. `weekly_results` and `monthly_results` store period boundaries, pair IDs, totals or win counts, and a `winner`.

The implemented behavior is uneven. Daily tracking is the most real feature: `/today` loads the current day's `daily_water` row, updates local state, and saves the final total via upsert. Weekly and monthly flows do perform real reads and attempted writes, but large parts of their UI are still placeholder content. Examples include hard-coded labels like `Sunday, October 24th`, `Week 42`, hard-coded comparison totals/charts, and a reward textarea/button that do not persist anything.

There is a likely logic bug in the weekly result creation path: the week page loads the current user's week entries and can load an existing `weekly_results` row, but it never computes partner totals into `weeklyTotals` before trying to create a new result. As written, insertion may never happen for a brand-new completed week.

The design system is informal but consistent: pastel blue/lavender/mint gradients, rounded cards, soft borders, blurred background blobs, and Material Symbols icons. `layout.tsx` loads Geist fonts, but `globals.css` still sets the body font to Arial/Helvetica, so intended and actual typography differ. There is no formal token file or component system.

Important technical debt:
- committed `.env.local` with live-looking public Supabase values
- default `create-next-app` metadata and README still present
- duplicated helper logic such as `getUserNames()`
- `useUser()` typed with `any`
- unused `participants.ts` and `auth.ts`
- unused starter SVG assets in `public/`
- archived duplicate source in `water-app-source.zip`
- generated `.next` and installed `node_modules` present inside app root

Missing but clearly implied features:
- onboarding/sign-up
- protected route handling
- persistent settings
- passcode setup/update
- reminder scheduling
- monthly wish persistence/notification
- historical week/month navigation
- tests and deployment/setup docs

If you change this code, treat `water-app/` as the only app root, do not invent missing backend layers, and mark database assumptions as inferred unless you also add checked-in schema artifacts.
