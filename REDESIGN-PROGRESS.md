# Redesign Progress Notes

## Branch
`master` tracking `origin/security-maintenance`  
Push with: `git push origin master:security-maintenance`

## Completed
- `35da5ac` — Dashboard upgrades (typography, icons, badges, empty state, narrow breakpoint)
- `3988b1e` — Fix dashboard activity panel collapse
- `fa4eb51` — Phase 1 foundation (shadows, inkMuted darken, statuses.ts, ConfirmModal, ContentFrame on 8 screens, breakpoints, forgot-password, auth autocomplete, Overline/SecondaryButton/TextLink, nav accessibility)
- `da86f94` — Phase 2 (hero floating callouts + Overline, CategoryTiles shared component, search debounce/stale-guard + active filter chips). Pushed to security-maintenance.
- `5f62e27` — Phase 3 (product cards: goldSoft tag chips + inline rating; shadow.card on cart/checkout/PDP). Pushed.
- `3b515a3` — Phase 4 (ConfirmModal rollout on manage-orders/manage-furniture/both profiles; dashboard log routing + empty-state + metric padding + narrow breakpoint). Pushed.

All 4 phases complete and pushed to `security-maintenance`.

## Remaining / optional follow-ups
- PDP thumbnail strip deferred (items have a single image_url; not data-backed).
- Image upload permission alert (`src/lib/imageUpload.ts`) left as native Alert — it's a permission error, not a confirmation.
- Payment success alert (`src/app/(user)/payment.tsx`) left as custom one-action alert — it's a notification, not a confirmation.

## Verification commands
```powershell
npx tsc --noEmit
npx expo lint
npx expo export --platform web   # full web compile check (takes ~2 min)
```

## Key file locations
- `src/constants/design.ts` — shadow.card, inkMuted (#6B5D52)
- `src/constants/statuses.ts` — shared getStatusBadge
- `src/components/confirm-modal.tsx` — shared ConfirmModal
- `src/components/category-tiles.tsx` — new, for home + search
- `src/components/app-ui.tsx` — Overline, SecondaryButton, TextLink added
- `src/app/(auth)/forgot-password.tsx` — new
