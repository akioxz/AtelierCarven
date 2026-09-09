# Redesign Progress Notes

## Branch
`master` tracking `origin/security-maintenance`  
Push with: `git push origin master:security-maintenance`

## Re-skin: The Workshop Manifest (committed + pushed)
World direction chosen via impeccable: maker's-atelier ledger — kraft/canvas neutrals, graphite ink, one burnt-oxide signal, IBM Plex Mono tabular data, Archivo display, squared corners, no gold/ornament. Scope: customer-facing first; full replacement; "too precious/decorative" is the worst outcome.

### Verified done this session
- Fonts swapped: `@expo-google-fonts/archivo` + `@expo-google-fonts/ibm-plex-mono` installed; `cormorant-garamond` + `manrope` removed.
- `src/constants/design.ts` rewritten: canvas `#E9E3D6`, surface `#F5F0E4`, surfaceMuted `#DDD5C4`, ink `#1D1B17`, inkSoft `#5A554B`, inkMuted `#76705F`, line `#CFC6B2`, accent `#B5501E`, accentDeep `#8A3A12`, accentSoft `#E3C6A3`, success `#39553A`, danger `#A3312F`; radius small 4 / card 10 / sheet 14; fonts display/body=Archivo, mono=IBM Plex Mono; shadows hardened to ink.
- `Design.color.gold/goldDeep/goldSoft` renamed to `accent/accentDeep/accentSoft` across `src` (0 refs to `.gold`).
- `_layout.tsx` font loading swapped; `app-ui.tsx` (BrandMark, overlines, nav, buttons), `product-card.tsx` (stamped tags, squared heart), `category-tiles.tsx`, `confirm-modal.tsx`, `statuses.ts` restyled.
- All customer screens re-skinned (home, search, favorites, product, cart, checkout, payment, order-success, profile, image-placement, + auth group): squared buttons/chips/modals, re-tinted error/success washes, ink-tinted backdrops.
- Bespoke world details: home hero ledger callout (`{furniture.length}` "pieces in the ledger" — truthful, was "50+"), product serial `ATELIER № {id8}` in mono, order-success `DISPATCH STAMP · THE CRATE GOES OUT` overline; ledger/data labels (EST. 2026, collection/result counts, callout sub) set to mono.
- `tsc`, `expo lint`, `expo export --platform web` all clean.

### Shipped (admin + polish, same commit as customer re-skin)
- Admin surfaces squared/re-tinted: `manage-orders.tsx` (filter pills, status pills, status badge, modal sheet radius, close btn), `profile.tsx` (role badge, avatar edit badge), `manage-furniture.tsx` (filter pills, category pills, edit/delete btns, textarea, gallery delete, image badge), `activity-logs.tsx` (log badge), `dashboard.tsx` (action icon, welcome icon). Admin hex washes (Added/Edited/Deleted) kept as-is — palette-coherent.
- `app.json` splash + adaptiveIcon `backgroundColor` re-tinted `#F5F0E8` → `#E9E3D6` (canvas).
- Throwaway debug scripts deleted: `scripts/debug-product.mjs`, `scripts/debug-checkout.mjs`. Kept `style-check.mjs`, `screenshot-check.mjs`, `serve-dist.mjs`, `browser-check.mjs`.
- Verification re-run green: `tsc`, `lint`, `expo export`, and `style-check.mjs` (all 21 checks pass).

### Verification
`scripts/style-check.mjs` (computed-style + full-flow browser pass on static `dist/` via `scripts/serve-dist.mjs`: onboarding → signup → home → product → checkout (form filled) → /payment → /order-success) — **ALL 21 CHECKS PASS** on the final run. Screenshots (for human review) in `C:\Users\User\AppData\Local\Temp\opencode\browser-artifacts\reskin\` (01–06: onboarding/home/product, desktop + mobile).

### NOT done / blocked (next session)
- Impeccable finish step NOT run: finish review + verdict + `DESIGN.md` update.
- `.impeccable/surfaces/src-app-user-home.md` holds the surface brief + direction contract.

### Finish step (impeccable) — done
- Legacy `gold` style names scrubbed from `src` (`goldDivider`→`accentDivider`, `goldLine`→`accentLine`, Overline tone `"gold"`→`"accent"`) — zero `gold` matches remain.
- `DESIGN.md` rewritten to the shipped Workshop Manifest world (Archivo + IBM Plex Mono, canvas/surface/ink/accent tokens, radii 4/10/14, FINISH line verbatim).
- Shipping rasters captured to `.impeccable/review/` with provenance + verdict (`desktop.png`, `mobile.png`, route shots; `PROVENANCE.md`, `VERDICT.md`). `scripts/capture-review.mjs` added.

## Completed
- `90add6e` — Fix PressScale wrapper collapsing absolutely-positioned buttons on web
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
