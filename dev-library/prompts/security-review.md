# Prompt: Security Review Pass (Batched)

## Purpose
Run the security checklist against an existing codebase in small, reviewable batches — not one exhaustive pass that overwhelms the session or the reviewer. Use for a session whose goal is a security pass (paired with [[project-continuation-prompt]] and [[security-checklist]]), or as a pre-launch gate before [[deployment-checklist]].

## The prompt
```
You are doing a security review pass on this codebase. Work in small batches:
pick three to five checklist items from the attached [[security-checklist]],
verify each against the ACTUAL code with grep/search (never "this looks fine"),
report one finding per item with file:line evidence, and stop for my review
before moving to the next batch. Do not fix anything until I approve each
finding's fix.

Prioritize the first batch as:
1. Secrets in source or bundles — search for .env values in committed files,
   service-role/admin keys, hardcoded tokens, and googleable secret-shaped
   strings; check what's actually in the client bundle (the user can request
   an export if you can't access it)
2. Row-level security / ownership — for every table the app queries, confirm
   RLS is enabled with real per-user policies and no USING (true); confirm
   every endpoint checks the caller OWNS the record, not just that they're
   authenticated
3. IDOR / mass assignment — endpoints that accept client-provided ids, roles,
   is_admin, prices, or amounts
4. Input handling — raw SQL built from user input, dangerouslySetInnerHTML /
   raw HTML rendering, unsanitized user content in any export
5. Auth session handling — tokens in AsyncStorage/localStorage instead of
   secure storage, sessions not invalidated on role/password change

For each finding, report:
- CHECKLIST ITEM: which checklist item it maps to
- EVIDENCE: file path + line, and the code or config that shows the issue
- SEVERITY: High / Medium / Low
- PROPOSED FIX: the minimal change, and any test that should accompany it

State explicitly when a checklist item is VERIFIED-SAFE (with the evidence
that convinced you) rather than silently skipping it — "no finding" must mean
"I checked and here's why it's fine," not "I didn't look."

After I approve fixes for batch 1, apply them, then start batch 2. Continue
until the attached checklist's relevant tiers are done, then run the project's
test suite and confirm nothing regressed.
```

## Usage notes
1. Always attach the [[security-checklist]] when pasting.
2. Batch size of 3–5 keeps fixes reviewable and lets you stop between batches.
3. Insist on file:line evidence — a security review that doesn't cite the code is a vibe check.
4. Pair this with [[generate-api-routes]] or `[[api-contract]]` when the review is specifically about new endpoints.

## Changelog
- v1 — initial version.

## Related
- Prompts: [[project-continuation-prompt]], [[generate-api-routes]]
- Rules: [[security-checklist]], [[api-contract]]
- Workflows: [[ai-development-workflow-map]]

---
Last updated: 2026-09-07