# Prompt: Generate API Routes (Standardized Endpoints)

## Purpose
Have an AI scaffold a new REST endpoint (or set of endpoints) that follows a single, enforced contract — typed schemas, one error envelope, validation at the boundary, pagination where needed, auth/ownership checks, and idempotency where the call has side effects. Attach [[api-contract]] and [[security-checklist]] when using this.

Works for any backend: Supabase Edge Functions, PostgREST tables + RPC, Express/Fastify/Next.js routes.

## The prompt
```
You are scaffolding a production-quality API endpoint for this project. Follow
the existing conventions you find in the codebase — read how current routes are
structured and match them. Do not invent a parallel style.

For each endpoint you produce, deliver ALL of the following, in this order:

1. ROUTE DEFINITION
   - Method + path, plural-resource naming, no verbs in the URL
   - Which existing file/route group it belongs to

2. CONTRACT (types/schemas, defined first)
   - Request input schema with field types, required/optional, and format rules
   - Response schema with server-generated fields (id, timestamps, ownership)
   - Third-party responses you consume are validated as untrusted input

3. VALIDATION
   - Zod / equivalent schema validation at the route boundary
   - On failure: 422 with a consistent machine-readable error code

4. ERROR HANDLING
   - Every failure path returns the project's standard error envelope with
     correct status code (400/401/403/404/409/422/429/500)
   - 500s never leak internals; full details captured in server logs only

5. SECURITY
   - Auth: who may call this, enforced server-side
   - Ownership: the caller may only act on records they own (not "is logged in")
   - Rate limit if this can be abused (login, signup, reset, cost-per-call)
   - Parameterized queries / RLS: no string-built SQL, RLS policies on new tables
   - Fields returned are trimmed to what the client needs

6. IDEMPOTENCY (only if this call has side effects — creates, payments, sends)
   - Accept Idempotency-Key; claim it in ONE atomic INSERT with a unique
     constraint (never SELECT-then-INSERT)
   - Same key + different payload → fail loudly (422)
   - Reused key → replay stored response
   - Key derivation documented; retention outlives the retry path

7. TESTS
   - Contract tests: valid input, each validation failure, each error path
   - Auth/ownership tests: unauthenticated, wrong-owner, and (for RLS) the
     anon key hitting the table directly
   - Idempotency test: retry with same key returns same result, does not
     double-create

Show me the contract (items 1-2) and the security notes (item 5) for review
BEFORE writing implementation or tests. After I confirm, implement the route,
tests, and any migration the contract requires (attached migration skill if
the project has one).
```

## Usage notes
1. Attach `[[api-contract]]` + `[[security-checklist]]` when pasting (or the generated prompt already references them).
2. Review the contract + security block it shows before it writes code — that's the cheap time to catch design mistakes.
3. Confirm it named the ownership/RLS policy explicitly; "it checks the user is logged in" is not an ownership check.
4. If the endpoint touches money or order state, insist the idempotency item is present — do not accept "retries are rare."

## Changelog
- v1 — initial version.

## Related
- Prompts: [[start-new-project-prompt]], [[project-continuation-prompt]]
- Rules: [[api-contract]], [[security-checklist]]
- Workflows: [[ai-development-workflow-map]]

---
Last updated: 2026-09-07