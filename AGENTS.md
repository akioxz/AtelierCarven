# AtelierCarven — Agent Quick Reference

## Stack
- **Expo SDK 54** + React 19 + React Native 0.81 + TypeScript 5.9
- **Expo Router** (file-based routing, typed routes enabled)
- **Supabase** (PostgreSQL, Auth, Storage) — project ref `hghsiwgxzawivwgsqdvd`
- **NativeWind/Expo UI** + custom design tokens (`src/constants/design.ts`)

## Essential Commands
```bash
# Dev
npx expo start          # start dev server
npx expo start --web    # web dev

# Verification (run in order)
npx tsc --noEmit        # typecheck
npx expo lint           # lint
npx expo export --platform web  # full web compile (~2 min)

# DB (Supabase CLI)
supabase migration list
supabase db push        # requires linked project + DB password
supabase db pull        # generate migration from remote
supabase db advisors    # security/performance lints
```

## Git & Branching
- **Local `master` tracks `origin/security-maintenance`** — push with:
  ```bash
  git push origin master:security-maintenance
  ```
- Remote default branch is `master` (no `main`)
- `security-maintenance` branch holds security/DB hardening work

## Supabase Notes
- **Imperative migrations** in `supabase/migrations/` (no declarative schemas)
- Local Supabase config: `supabase/config.toml` (project_id = "AtelierCarven")
- Remote DB: `hghsiwgxzawivwgsqdvd` (org `jpghrsatspcsvyhlqmgx` = "Personal Projects")
- **CLI not linked by default** — run `supabase login --token <PAT>` then `supabase link --project-ref hghsiwgxzawivwgsqdvd` (prompts for DB password)
- Data API requires explicit `GRANT SELECT ... TO anon, authenticated` on tables

## Project Structure
```
src/
├── app/                    # Expo Router pages (file-based routing)
│   ├── (auth)/             # Auth group (login, signup, forgot-password, onboarding)
│   ├── (user)/             # User-facing screens (home, product, cart, checkout, etc.)
│   ├── (admin)/            # Admin screens (dashboard, manage-orders, manage-furniture, profile)
│   ├── _layout.tsx         # Root layout
│   └── index.tsx           # Entry (redirects to home)
├── components/             # Shared UI components
│   ├── app-ui.tsx          # Overline, SecondaryButton, TextLink, nav accessibility
│   ├── confirm-modal.tsx   # Shared confirmation modal (danger-aware)
│   ├── category-tiles.tsx  # Category tiles (home + search)
│   └── ...
├── constants/
│   ├── design.ts           # shadow.card, inkMuted (#6B5D52), narrowBreakpoint (500)
│   ├── statuses.ts         # getStatusBadge() for order/furniture statuses
│   └── colors.ts
├── hooks/                  # Platform-specific hooks (use-color-scheme)
├── lib/
│   ├── supabase.ts         # Supabase client (anon key)
│   └── imageUpload.ts      # Image upload with native Alert for permissions
└── global.css
```

## Environment
- Copy `.env.example` → `.env` with:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `.env` is gitignored; do not commit

## Issue Tracker
- GitHub Issues via `gh` CLI (see `docs/agents/issue-tracker.md`)
- Create: `gh issue create --title "..." --body "..."`
- List: `gh issue list --state open --json number,title,body,labels,comments`
- PRs are **not** a request surface (external PRs not triaged as issues)

## Domain Docs
- Single-context: root `CONTEXT.md` + `docs/adr/` (see `docs/agents/domain.md`)
- Read ADRs before changing related areas; flag conflicts explicitly

## Key Design Tokens
- `shadow.card`: `{ shadowColor: "#211A16", shadowOffset: {0,8}, shadowOpacity: 0.08, shadowRadius: 24, elevation: 6 }`
- `inkMuted`: `#6B5D52` (darkened from default)
- `layout.narrowBreakpoint`: `500`
- Overline: `Manrope_600SemiBold 11px`, `letterSpacing: 2.5`, uppercase

## Common Gotchas
- **Don't use `Start-Process npx.cmd`** — opens console windows; use `npx expo export --platform web` for compile verification
- Hover-only interactions need touch equivalents (shared web+mobile codebase)
- Placeholder photography only — no real images in repo
- `expo-router` typed routes enabled; import types from `.expo/types/`
- React Compiler enabled in `app.json` experiments