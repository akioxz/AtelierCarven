---
name: supabase-migrations
description: "Create or review Supabase/Postgres database migrations: naming conventions, enabling RLS on every new table with real policies, index strategy, type choices, reversible schema changes, and a pre-apply review checklist. Use when adding, altering, or dropping tables/columns/functions, or when reviewing existing migrations."
---

# Supabase Migrations

Use when a change touches the database schema: new tables or columns, altered types, new RPC functions or triggers, or new indexes. Applies to Supabase projects working with the `supabase/migrations/` directory and the Supabase CLI.

## Workflow

1. Read the current schema context first — check `supabase/migrations/` for the latest numbered migration and any tables the change touches. Never write a migration in isolation from what already exists.
2. Write the migration as a new dated file, not by editing an applied migration (applied migrations are history; change requires a new one).
3. Enable RLS (`alter table ... enable row level security`) on every new table, in the **same migration** that creates it, with real per-user policies using `(select auth.uid())`.
4. Review the pre-push checklist below before applying.

## Hard rules

- **RLS is on by default for new tables.** Create table + `enable row level security` + policies in one migration. A new table without policies leaks data through the anon key the moment it's exposed.
- **No `USING (true)` / `with check (true)` policies** — those mean "anyone authenticated (or unauthenticated) can read/write everything."
- **Never build identifiers from user input**, and never put application secrets in SQL literals committed to the repo.
- **Prefer forward-compatible changes.** The app running the previous version must keep working during a rollout: only add nullable/new columns and indexes at this stage; dropping or retyping a column still read by the old build needs a two-step migrate→deploy→drop sequence.
- **Use proper types, not generic free text.** Prefer `timestamptz` over `timestamp` for user-facing times, `uuid` (with a real default `gen_random_uuid()`) for PKs on new tables, `numeric`/`integer` for money and counts, and `text` with a `check` constraint instead of unconstrained `varchar(n)` where a length matters.

## Pre-push review checklist

- [ ] Migration ordered after the last existing one; filename follows project convention
- [ ] Every new table has `enable row level security` + per-user policies in the same migration
- [ ] Policies reference `auth.uid()` and check ownership, not just "is logged in"
- [ ] Indexes exist for every column used in a `where`, `order by`, or `join` that will see large data; prefer partial/smaller indexes over blanket ones
- [ ] Primary keys declared on new tables (uuid with a default, via extension `gen_random_uuid()` where available)
- [ ] No destructive changes staged before the old app version is gone (columns read by the old build stay until after deploy)
- [ ] `supabase db reset` / local dev replay of the migration chain succeeds before pushing
- [ ] For export/reporting tables and anything cross-schema: explicit `grant ...` (or revoke) on privileges — least-privilege, not everything-to-everyone
- [ ] Run `supabase migration list` to confirm the remote chain matches local

## Reversibility notes

- Down-migrations (`down.sql`) are conventionally optional. Instead, keep each migration reversible by preference: additions are naturally reversible; for drops, never drop without confirming the old app version no longer references the object.
- Test a fresh replay — wiping the local database and re-applying the whole migration chain is the only way to guarantee the chain works for the next developer.

## Constraints

This skill writes and reviews migrations; do not apply migrations to a remote production database without explicit approval. When a change is only cosmetic or internal (no schema change), skip this skill.

## Related (dev-library cross-links)
- Rules: security-checklist.md (RLS / least-privilege items are database-specific here)
- Prompts: invoked via a "database/migration" goal in project-continuation-prompt.md
- Workflows: ai-development-workflow-map.md