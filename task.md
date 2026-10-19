# AtelierCarven — Current Task

2026-10-18: Dev audit of the current working tree using `.devlib/skills/full-system-audit/SKILL.md`. Inspection and backlog recording only; repairs require a selected scope. Existing local changes were preserved.

## Active Phase: System Audit Fixes

### P1 — High priority

- [x] [P1 #1] Restrict public profile access. Applied `20261019015425_restrict_public_profiles.sql` to project `hghsiwgxzawivwgsqdvd` after explicit approval. Live role checks passed for anonymous denial, owner isolation, admin reads/order joins, and review RPC execution. The isolated fixture verifies reviewer names and safe fields; there are no live reviews. Updated product caller is committed locally and served by Expo Go development; signed-in device review rendering remains pending.
- [ ] [P1 #2] Make checkout completion atomic and handle every write failure. Local repair and regression checks are ready; live application of `20261019030000_atomic_checkout.sql` awaits specific approval. `src/app/(user)/checkout-review.tsx:81-119` creates the order separately, logs an order-item insertion failure, then clears the cart and shows success. Cart deletion errors are also ignored. Preserve the cart and report failure unless the complete order succeeds.
- [ ] [P1 #3] Remove the URL total as checkout authority. `src/app/(user)/checkout-review.tsx:51,67-85` refetches cart lines but inserts the earlier, editable route total unchanged. Changed carts can disagree with the displayed/submitted total. Recompute from an authoritative snapshot; server-side recalculation/protection is currently unverified.
- [ ] [P1 #4] Carry sale pricing through the whole purchase flow. `src/components/product-card.tsx:81-90` and `src/app/(user)/home.tsx:208-214` display sale prices, while `product.tsx:133`, `cart.tsx:20`, `checkout.tsx:41`, and `checkout-review.tsx:105` use list prices. `favorites.tsx:91-103` also passes unmapped snake_case sale/review fields to the card. Use one effective-price contract consistently.
- [ ] [P1 #5] Handle recovery tokens in URL fragments. `src/app/(auth)/reset-password.tsx:34-41` only reads query parameters; `src/lib/supabase.ts:50` disables automatic URL detection. The installed auth client defaults to implicit flow. An offline probe of the installed Expo web parser returned no query keys for a synthetic recovery fragment. Parse the configured recovery flow and validate signed-out recovery entry.
- [ ] [P1 #6] Preserve chosen variants in orders. `src/app/(user)/product.tsx:55-57` stores color/material in the cart, but `checkout-review.tsx:101-106` omits both from the order-line payload before clearing the cart. Save and display an immutable variant snapshot for fulfillment.

### P2 — Correctness, reliability, and QA

- [ ] [P2 #1] Register the display fonts used by the theme. `src/constants/design.ts:21-22` selects Playfair, but `src/app/_layout.tsx:32-43` never loads it. Four unused font imports were reported by lint. Resolve the intended typography and register the actual families.
- [ ] [P2 #2] Surface customer write failures. `src/app/(user)/product.tsx:55-75` ignores cart/review errors and closes/resets the form; the unique review constraint makes a second review submission fail silently. Home/search favorite changes also lack rollback. Check returned errors and retain retryable state.
- [ ] [P2 #3] Report partial admin saves and failed deletion. `src/app/(admin)/manage-furniture.tsx:162-194` ignores size-guide write/deletion errors and closes the form; failed furniture deletion can still generate a success-like activity log. Gallery deletion at `:435-436` removes the local row regardless of the database result. Validate dimensions and confirm writes before updating UI/logs.
- [ ] [P2 #4] Keep review aggregates derived from reviews. `supabase/migrations/20260912000000_add_furniture_sale_ui.sql:17-24` overwrites ratings/counts with fixed 4.7/128 and 4.9/342 values rather than aggregating review rows. `20260902000000_reviews.sql:50-61` recomputes real aggregates on the next review change. Remove this competing source of truth or substantiate/import actual review data.
- [ ] [P2 #5] Recompute both products when a review moves. `supabase/migrations/20260902000000_reviews.sql:50-61` uses only the new furniture ID on UPDATE. The own-review UPDATE policy permits changing furniture_id, leaving the old product's rating/count stale. Make the relation immutable or recompute OLD and NEW IDs.
- [ ] [P2 #6] Paginate lists and aggregate revenue in the database. `src/app/(admin)/dashboard.tsx:30-33` sums an unpaginated result while `supabase/config.toml:18` caps responses at 1,000 rows. Counts and revenue can diverge after the cap. Orders, activity logs, and catalog list queries also lack pagination. Deployed API limits and actual dataset sizes are unverified.
- [ ] [P2 #7] Reject stale query responses. `src/app/(user)/home.tsx:51-58` allows an older category request to overwrite a newer selection. Admin order filters/details (`manage-orders.tsx:51-100`) have the same unguarded response pattern. Add cancellation or request identity checks.
- [ ] [P2 #8] Serialize cart quantity changes. `src/app/(user)/home.tsx:90-92`, `search.tsx:95-97`, and `cart.tsx:19,25` update from previously read quantities without an in-flight guard. Concurrent additions or rapid taps can overwrite increments. Serialize per item or use an approved atomic operation.
- [ ] [P2 #9] Isolate browser QA data and clean it up. `scripts/style-check.mjs:14,45-53,172-190` creates an account and confirms an order against the built app's backend, then only closes the browser. No backend isolation guard or data cleanup exists. Use an explicitly isolated backend/fixtures and cleanup on success/failure before running these flows.

## Active Phase: P1 #1 Profile Privacy Repair — 2026-10-19

- [x] Prepare a new forward migration removing the public profile policy and anonymous/PUBLIC SELECT grants, preserving owner reads and restoring admin profile reads.
- [x] Provide public review text/rating/date and author username through a narrow RPC; update the product caller with response validation.
- [x] Run `supabase/tests/profile_privacy.sql` on temporary PGlite 0.5.10 (PostgreSQL 18.6): vulnerable negative control, anon denial, owner/cross-user/admin reads and joins, owner updates, safe RPC projection/privileges/search path, and rollback all passed. User authorized the temporary test runtime; repo dependencies are unchanged.
- [x] Final TypeScript check passed. Lint passed with the same four pre-existing font warnings. Web export passed for 46 routes. Initial RPC typing regression was repaired before the final checks.
- [x] User explicitly approved the remote migration; verified the target and applied only the profile privacy repair as version `20261019015425`. Live read checks passed without writing customer data. Renamed the local migration and fixture reference to match remote history. The sale-data migration was already recorded remotely; no blanket push was used.


### Profile repair follow-up — 2026-10-19

- [x] Live PostgREST verification: anonymous profile ID and private-field queries both returned HTTP 401 / SQLSTATE 42501; the ordered review RPC returned HTTP 200 and an empty array for an unmatched product UUID.
- [x] Exported committed repair code separately from unrelated dirty work: 46 routes. Confirmed the exported bundle contains the new review RPC caller and no private environment values across 114 files.
- [x] Local browser smoke: protected product route redirected to onboarding when signed out; no error/warning console entries on the correctly served route. This does not verify signed-in review rendering or native behavior.
- [x] User confirmed Expo Go/local development. Started the existing workspace with `npx --no-install expo start --lan --port 8081`; Metro status and Android Expo manifest returned HTTP 200. Android launch bundle compiled (2,030 modules), returned HTTP 200, and contains the privacy-safe review RPC caller. Connect through `exp://192.168.254.105:8081` on the same network. No Vercel/EAS publication is required for this local workflow.
- [ ] Open/reload the app in Expo Go and check product reviews in a signed-in test session. No physical device or signed-in test session was available to this agent; no live review rows were created.


## Active Phase: P1 #2 Atomic Checkout Repair — 2026-10-19

- [x] Prepare `checkout_cart(numeric,text,text)` as a SECURITY INVOKER RPC using existing RLS. Lock/snapshot the owner's cart; save the order and all lines; delete snapshot IDs only; reject missing/suppressed writes so the transaction rolls back.
- [x] Move checkout confirmation to the RPC; require a valid order UUID before success navigation. Guard synchronous double taps, release processing state after failures, and show retryable cart-load errors. Transport failures warn that order status may be uncertain.
- [x] Isolated PostgreSQL fixture passed: vulnerable negative control, failed/skipped order/item/cart writes, RLS-denied cleanup, missing identity/anonymous denial, unavailable furniture, empty/repeated checkout, successful line/price snapshot, preserved later additions/other-user cart, and rollback. Minimal schema fixture; no live test orders or full migration-history replay. Separate concurrent SQL sessions have not been exercised.
- [x] All 14 actual-callback regression tests passed; TypeScript passed; lint passed with the four existing font warnings; temporary web export passed (46 routes). Initial fixture syntax/name ambiguity, test synchronization, and JSX lint failures were corrected before final checks.
- [ ] Obtain specific approval and apply only `20261019030000_atomic_checkout.sql` to `hghsiwgxzawivwgsqdvd`; align its local filename with remote migration history if needed. Verify the deployed function's definition/privileges and anonymous denial without creating live orders. Apply the migration before restarting the updated Expo caller.
- Scope remains P1 #2: total authority, sale pricing and variant snapshots retain their separate open findings. Existing dirty files are preserved. Expo Go remains stopped at the user's request.

## Verification Gaps

- Remaining order/role authorization is unverified. Customer order UPDATE is allowed by the RLS policy in `20260908000004_rls_initplan.sql:60-63` and the UPDATE grant in `20260908000000_rls_audit_and_grants.sql:118`. Intended role/order protection relies on `protect_profile_role` and `protect_order_admin_fields`, whose definitions and trigger attachments are absent from the local migration history. Do not claim a confirmed role/status exploit without inspecting those controls. Core table bootstrap definitions are also absent from this migration set.
- Desktop hero layout needs rendered verification: `src/app/(user)/home.tsx:293-295` switches to a row while its media retains width 100%, risking a collapsed/overflowing copy panel. Native safe areas, touch behavior, and accessibility have not been exercised on devices.
- Browser journeys were source-reviewed, not executed; existing scripts create remote data. P1 #1 received the separately approved live migration and SQL role checks described above; Anonymous PostgREST and signed-out local browser checks passed; signed-in browser/native behavior remains unverified. The temporary test runtime stayed outside repo dependencies. No app deployment was performed. The placement feature is a 2D image overlay; native behavior and public indexing remain unverified.

## Checks

- `npx tsc --noEmit`: passed.
- `npx expo lint`: passed with four unused Playfair import warnings.
- `git diff --check`: passed for tracked changes; the new backlog was reviewed separately.
- Offline recovery parser probe: confirmed fragment tokens are absent from `Linking.parse(...).queryParams`.
- `npx --no-install expo export --platform web --output-dir <temporary directory>`: passed, 46 static routes. This confirms compilation, not authenticated journey behavior.

## FUTURE WORK (Out of Scope)

- Implement only the findings selected by the user; scope database/auth changes separately and preserve the existing dirty worktree.
