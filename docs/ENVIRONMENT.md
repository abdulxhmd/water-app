# Environment

## Confirmed Runtime Variables
The app code reads exactly two environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

These are consumed in `src/lib/supabase.ts`.

## Confirmed Local File
`water-app/.env.local` exists and is committed in the project directory.

Important note:
- The file contains real-looking values rather than placeholders.
- This is a configuration hygiene and potential security issue.

## Variable Purpose

### `NEXT_PUBLIC_SUPABASE_URL`
Purpose:
- Supabase project URL used to initialize the JS client

Visibility:
- public
- bundled to the browser because it uses the `NEXT_PUBLIC_` prefix

### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
Purpose:
- Supabase public anon key used by the browser client

Visibility:
- public
- bundled to the browser because it uses the `NEXT_PUBLIC_` prefix

## Variables Not Found
The repository does not reference:
- server-only Supabase service role keys
- app URL variables
- analytics keys
- email provider keys
- notification provider keys
- feature flags
- environment-specific config files beyond `.env.local`

## Setup Expectations
To run the app successfully, a developer needs:
- valid values for the two public Supabase variables
- a Supabase project with matching auth users and tables
- policies that permit the current client-side access pattern

## Recommended `.env.local` Template
Use names only. Do not commit actual values.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Missing Environment Documentation
- no `.env.example`
- no description of Supabase project setup
- no explanation of required auth users
- no explanation of required pairing data
