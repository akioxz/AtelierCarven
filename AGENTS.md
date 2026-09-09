# AtelierCarven — Agent Quick Reference

## Stack
- **Expo SDK 57** + React 19.2 + React Native 0.86 + TypeScript 6.0
- **Expo Router** (file-based routing, typed routes enabled) — Router type moved to `ImperativeRouter` in `src/lib/navigation.ts`
- **Supabase** (PostgreSQL, Auth, Storage) — project ref `hghsiwgxzawivwgsqdvd`
- **NativeWind/Expo UI** + custom design tokens (`src/constants/design.ts`)
- `eslint-config-expo@57` enables React Compiler rules (`react-hooks/immutability`, `react-hooks/set-state-in-effect`) — fetch-on-mount effects use `void (async () => { await fetchX(); })();` (see commit notes); Reanimated `scale.value` writes carry targeted disables

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
- **Local `master` tracks `origin/master`** — work directly on `master`:
  ```bash
  git push origin master
  ```
- Remote default branch is `master` (no `main`)
- `security-maintenance` is a merged/legacy line (security + DB hardening work); `merge-security-maintenance` was its PR branch. Cleanup when convenient.

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
│   ├── design.ts           # Workshop Manifest tokens (canvas#E9E3D6, ink, accent#B5501E), shadow.card, radius, fonts, breakpoints
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
- Direction: **The Workshop Manifest** — maker's-atelier ledger, no gold/ornament (see `DESIGN.md` for the full spec)
- Canvas `#E9E3D6`, surface `#F5F0E4`, surfaceMuted `#DDD5C4`, ink `#1D1B17`, line `#CFC6B2`, accent `#B5501E` (was "gold"), accentDeep `#8A3A12`, accentSoft `#E3C6A3`, success `#39553A`, danger `#A3312F`
- `inkMuted`: `#76705F` (tertiary text/metadata)
- `shadow.card`: `{ shadowColor: "#1D1B17", shadowOffset: {0,2}, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3 }`
- Radius: `small: 4` / `card: 10` / `sheet: 14` (pills only where intentional, `pill: 999`)
- Fonts: **Archivo** display/body (`Design.font.display`/`body*`), **IBM Plex Mono** overlines/data/serials/ledgers (`Design.font.mono*`)
- Overline: `IBM Plex Mono 10px`, `letterSpacing: 2.2`, uppercase (`Design.color.accent`); brand overline `MonoMedium 10px @ 3.4`
- `layout.narrowBreakpoint`: `500`, `desktopBreakpoint`: `900`, `pageMaxWidth`: `1180`
- Guards (do not reintroduce): gold, cream-plus-serif, pill buttons, ornamental chrome — the ledger refuses them

## Common Gotchas
- **Don't use `Start-Process npx.cmd`** — opens console windows; use `npx expo export --platform web` for compile verification
- Hover-only interactions need touch equivalents (shared web+mobile codebase)
- Placeholder photography only — no real images in repo
- `expo-router` typed routes enabled; import types from `.expo/types/`
- React Compiler enabled in `app.json` experiments