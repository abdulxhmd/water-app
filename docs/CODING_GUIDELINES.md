# Coding Guidelines

## Current Conventions Observed In The Repository

### Framework and Language
- Next.js App Router
- React function components
- TypeScript in strict mode
- client components used for all interactive pages

### Imports
- project imports commonly use the `@/*` alias
- relative imports are still used for nearby app/component files

### File Naming
- route files use App Router conventions such as `page.tsx`
- component files use PascalCase
- lib files use lowercase names

### Styling
- styling is primarily inline Tailwind utility classes
- custom animation and theme variables live in `globals.css`
- there is no CSS Modules usage
- there is no styled-components or emotion usage

### State and Side Effects
- component-local `useState`
- `useEffect` for all async fetching
- no centralized store
- no query library

### Data Access
- Supabase queries are written inline in page components
- no repository layer
- no database typing

### Error Handling
- errors are logged with `console.error`
- user-facing failures often use `alert(...)`
- there is no structured error boundary or toast system

### Routing
- `Link` for navigation
- `useRouter().push()` after login/logout

## Effective Rules To Follow When Editing This Codebase
- Keep new page behavior in client components unless a server-side reason exists.
- Use the `@/` alias for shared app imports.
- Match the existing Tailwind-first styling approach.
- Preserve the soft hydration visual language.
- Prefer explicit local state over introducing a new state library unless a larger refactor is intended.
- When touching Supabase queries, keep table and column names aligned with the existing query patterns.
- Treat any undocumented database column as inferred until validated against the real Supabase schema.

## Gaps In The Current Code Standards
- no lint rule customization beyond Next defaults
- no formatting config committed
- no test conventions
- no commit or branching conventions documented in repo files
- no typed domain models
- no API-layer abstraction standard

## Issues Worth Correcting In Future Work
- replace `any` in `useUser`
- move duplicated helpers into shared modules
- stop committing environment files with live credentials
- replace `alert` with in-app error messaging
- avoid hard-coded participant names in page files
- separate mock/presentational sections from real data-driven sections

## Suggested Practical Standard For This Repo
- Create one shared module per concern:
  - `lib/date.ts`
  - `lib/participants.ts`
  - `lib/queries.ts`
  - `lib/types.ts`
- Keep page files focused on composition.
- Keep side-effect logic in reusable functions or hooks.
- Annotate inferred schema assumptions in code comments when the schema is not local to the repo.
