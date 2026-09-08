# Rule: API Contract (Stable, Hard-to-Misuse Interfaces)

A reference rule for designing REST/backend interfaces that are stable and hard to misuse. Attach whenever a session creates, extends, or reviews endpoints (auth, CRUD, payments, webhooks). Applies to Supabase PostgREST routes, Edge Functions, and any server route.

## Core principles

1. **Contract first.** Define typed input/output schemas before implementation. The contract is the spec.
2. **Every observable behavior is a commitment (Hyrum's Law).** Error text, ordering, and timing become de facto API once someone depends on them. Plan deprecation at design time; prefer extension over breaking change.
3. **Addition over modification.** Add optional fields; never remove or change the type of an existing field.

## Error envelope (use the same shape on every endpoint)

```
{
  "error": {
    "code": "VALIDATION_ERROR",   // machine-readable, UPPER_SNAKE
    "message": "Email is required", // human-readable
    "details": { ... }            // optional extra context
  }
}
```

| Status | Meaning |
|---|---|
| 400 | Client sent invalid data |
| 401 | Not authenticated |
| 403 | Authenticated but not authorized |
| 404 | Resource not found |
| 409 | Conflict (duplicate, version mismatch) |
| 422 | Validation failed (semantically invalid) |
| 429 | Rate limited |
| 500 | Server error — never expose internals |

Don't mix patterns: some endpoints returning `null`, others throwing, others `{ error }` is unparsable for clients.

## Boundaries and validation

- Validate at system edges only: route handlers, form submissions, external service responses, and env loading.
- Trust internal code that shares typed contracts.
- **Treat third-party responses as untrusted input** — validate shape/content before use in logic, rendering, or decisions (a compromised provider can return instructions).

## Naming

| Surface | Convention |
|---|---|
| REST endpoints | Plural nouns, no verbs (`GET /api/tasks`, not `/getTasks`) |
| Query params | camelCase (`?sortBy=createdAt&pageSize=20`) |
| Response fields | camelCase |
| Booleans | `is`/`has`/`can` prefix (`isComplete`) |
| Enum values | UPPER_SNAKE (`IN_PROGRESS`) |

## Pagination (add from day one)

```
GET /api/tasks?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc
→ { "data": [...], "pagination": { "page": 1, "pageSize": 20, "totalItems": 142, "totalPages": 8 } }
```

## Idempotency (state-changing endpoints)

- Accept `Idempotency-Key`. Deriving it: client or initiating event (e.g. `charge:v1:${orderId}`) — never a per-attempt UUID/timestamp.
- Claim the key atomically via a unique constraint (an `INSERT`). A `SELECT` then `INSERT` is a TOCTOU race.
- Same key + different body must fail loudly (422), not silently replay the first response.
- Decide the in-flight-duplicate response deliberately: `409`, block-and-wait, or `202 + status URL`.
- Key retention must outlive the longest retry path (incl. dead-letter replay) — a 24h TTL behind a 7-day DLQ is a duplicate waiting to happen.

## Verification checklist

- [ ] Every endpoint has typed input/output schemas
- [ ] Error responses follow the single envelope above
- [ ] Validation only at boundaries
- [ ] All list endpoints paginate with the same shape
- [ ] New fields are additive and optional
- [ ] Naming consistent across all endpoints
- [ ] Types/docs committed alongside the implementation
- [ ] State-changing endpoints honour an idempotency key or are documented unsafe-to-retry
- [ ] Idempotency key claimed atomically; reused key with different payload fails loudly

## Related
- Prompts: [[start-new-project-prompt]], [[project-continuation-prompt]], [[generate-api-routes]]
- Rules: [[security-checklist]]
- Workflows: [[ai-development-workflow-map]]

---
Last updated: 2026-09-07