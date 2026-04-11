# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is the **Invoice Manager** app ("Vishwa Shree Enterprises") — a single Next.js 16 (App Router, React 19) application backed by Supabase (Auth + Postgres with RLS). See `README.md` for architecture diagrams and project layout.

### Required environment variables

A `.env` file in the project root must contain:

```
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<supabase-anon-key>
```

The Supabase client helper (`src/lib/supabase/env.ts`) accepts either `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`.

### Common commands

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` (localhost:3000) |
| Lint | `npm run lint` |
| Build | `npm run build` |

### Caveats

- **No lockfile committed.** The `.gitignore` excludes all lock files. `npm install` resolves from `package.json` each time.
- **ESLint has pre-existing errors** (12 errors, 11 warnings as of `fixes-bugs-v0.1`). Most are `react-hooks/set-state-in-effect` and `@next/next/no-img-element` warnings. These are not environment issues.
- **No automated tests exist** in this codebase. There is no test framework or test runner configured.
- **All routes require Supabase auth.** Without valid Supabase credentials in `.env`, the app will crash on startup. The middleware redirects unauthenticated users to `/login`.
- **Database migrations** are in `supabase/migrations/` but gitignored. The Supabase project must already have the schema applied.
