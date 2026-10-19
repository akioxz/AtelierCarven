# AtelierCarven — Current Task

2026-10-18: Dev audit of the current working tree using `.devlib/skills/full-system-audit/SKILL.md`. Inspection and backlog recording only; repairs require a selected scope. Existing local changes were preserved.

## Active Phase: System Audit Fixes

### P1 — High priority

- [x] [P1 #1] Restrict public profile access. Applied `20261019015425_restrict_public_profiles.sql` to project `hghsiwgxzawivwgsqdvd` after explicit approval. Live role checks passed for anonymous denial, owner isolation, admin reads/order joins, and review RPC execution. The isolated fixture verifies reviewer names and safe fields; there are no live reviews. Updated product caller is committed locally; Expo was subsequently stopped at user request; signed-in device review rendering remains pending.
- [x] [P1 #2] Make checkout completion atomic and handle every write failure. Applied `20261019021942_atomic_checkout.sql` to live project `hghsiwgxzawivwgsqdvd` after specific approval. One invoker RPC commits the order, all lines and exact cart cleanup together; client errors cannot navigate to success. SQL rollback fixture and 14 client checks passed. Live metadata/privilege/identity/empty-cart checks passed without creating orders. Real signed-in checkout remains unexercised.
- [x] [P1 #3] Remove URL-total authority. Client totals now come from the loaded cart; the prepared checkout RPC recomputes effective prices from a locked snapshot and rejects a changed/tampered expected total. Applied in combined migration `20261019031255`.
- [x] [P1 #4] Use one effective-price contract across cards/favorites/product/cart/checkout, including valid sales and currency rounding. The prepared server snapshot uses the same sale rule. Applied in combined migration `20261019031255`.
- [x] [P1 #5] Handle recovery proofs in query parameters/fragments and native Expo links. Validate complete recovery tokens, PKCE codes or recovery token hashes; invalid links cannot enable submission; the root signed-out guard preserves recovery entry. Pure URL tests pass; real email/deep-link/device recovery remains unexercised.
- [x] [P1 #6] Prepare persisted color/material order snapshots, a trigger rejecting variant changes, and customer/admin detail display. Applied in combined migration `20261019031255`; historical rows remain null rather than invented.

### P2 — Correctness, reliability, and QA

- [x] [P2 #1] Register all four existing Playfair imports in the root font loader; tests verify the families and lint is clean. The user's pending theme changes are preserved.
- [x] [P2 #2] Customer favorite/cart/review write failures are visible. Confirmed writes update UI; failed cart/review submissions keep the modal, chosen options and draft. Duplicate reviews receive a specific message. Atomic add-cart RPC is live in migration `20261019031255`.
- [x] [P2 #3] Validate dimensions and check every furniture/guide/gallery/log write. Partial saves keep the form and saved row ID for safe retry; failed deletes do not remove local images or log success. Failure callback tests pass; no live admin mutation was run.
- [x] [P2 #4] Prepare a forward migration rebuilding ratings/counts solely from stored reviews. Applied historical seed migrations are preserved. Approved aggregate correction applied in `20261019031255`; live aggregate mismatches: zero.
- [x] [P2 #5] Prepare trigger recomputation for both OLD/NEW product IDs, with deterministic parent row locks. Isolated move/update/delete checks pass. Applied in combined migration `20261019031255`.
- [x] [P2 #6] List readers now fetch deterministic bounded database pages with exact counts and visible errors; tests cross 1,000 rows and a smaller server cap. Dashboard summary aggregates in SQL with an admin check. Lists still retain loaded rows in client memory. Live dashboard RPC matches privileged aggregate reads and rejects non-admin access.
- [x] [P2 #7] Home/search and admin order/detail requests invalidate stale responses on selection changes/cleanup. Deferred-response tests prove older requests cannot replace newer data/loading state.
- [x] [P2 #8] Replace read-then-set cart quantities with prepared per-owner serialized addition and row-locked delta RPCs; retain variant identity and guard checkout while cart changes are pending. Isolated quantity/isolation tests pass. Applied in combined migration `20261019031255`.
- [x] [P2 #9] QA requires explicit local-only opt-in, loopback app/local Supabase, isolated user/product fixtures, remote request blocking, and dependency/account cleanup in finally. Guard/cleanup tests use a fake local client; the mutating browser journey was not executed.

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
- [x] User explicitly approved; applied only the atomic checkout RPC as remote version `20261019021942`. Live function body matched tested source; invoker/search-path/execute grants, anonymous denial, missing identity and empty-cart rejection passed. No live order was created. Aligned local filename/fixture reference with remote history; Expo stays stopped.
- Scope remains P1 #2: total authority, sale pricing and variant snapshots retain their separate open findings. Existing dirty files are preserved. Expo Go remains stopped at the user's request.


## Active Phase: Remaining 13 Repairs — 2026-10-19

- [x] Implement source repairs for P1 #3-#6 and P2 #1-#9, with the shared pricing/page/recovery helpers and one forward SQL migration.
- [x] Keep failures visible and state retryable; preserve pre-existing UI edits and user-owned files; keep Expo stopped.
- [x] Focused verification: 31 client/helper/QA tests passed; prior privacy and atomic SQL fixtures passed; combined repair SQL fixture passed. TypeScript and lint passed without warnings; temporary web export passed 46 routes. Initial duplicate state/missing callback, effect lint issues and a fixture statement-order assertion were repaired within the two-fix limit.
- [x] Independently verified the staged source without unrelated UI changes: regression checks, TypeScript/lint and 46-route export passed. Restored Expo's generated ignored type reference in the temporary checkout; cleared a stale Metro cache and confirmed repaired feature markers plus no private environment values in the 126-file export. No dependency install or server restart.
- [x] User explicitly approved and applied `supabase/migrations/20261019031255_remaining_audit_repairs.sql` on `hghsiwgxzawivwgsqdvd`. It adds order variant columns/immutability trigger, updates server checkout pricing/total checks, adds atomic cart/admin summary RPCs, and rebuilds actual review aggregates. Only the approved migration and review-aggregate correction were applied; no live test accounts, orders or fixture data were created.
- [x] Post-apply live checks passed: all six function bodies match tested source; invoker/definer settings, pinned search paths, grants, variant columns/trigger and review aggregate consistency verified. Anonymous/missing-identity calls reject access; unmatched cart calls fail before writes; non-admin summary denied and admin summary matches full SQL aggregates. All four anonymous PostgREST RPC requests returned HTTP 401 / 42501. Local migration/fixture history aligned without SQL changes; isolated fixture rerun passed.
- Remaining verification limits: full local Supabase replay requires the base schema absent from this repo; separate concurrent DB sessions, real email recovery, signed-in browser/native journeys, and the full local mutating QA script remain unexercised.

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
