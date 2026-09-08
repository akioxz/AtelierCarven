# Workflow: AI Development Workflow Map

## When to run this
Read this first when unsure which prompt/rule/skill in the library to reach for on a project — it's the index and ordering for the whole AI-development toolkit below.

## The files

| File (dev-library path) | Type | Purpose |
|---|---|---|
| `prompts/start-new-project-prompt.md` | Generator | Produces a starter prompt for a brand new project |
| `prompts/project-continuation-prompt.md` | Generator | Produces a prompt to continue, audit, or security-pass an existing project |
| `prompts/generate-skills-agents-rules-agentic.md` | Generator | Produces the actual skills/agents/rules/context files by exploring your codebase directly |
| `prompts/generate-skills-agents-rules-loop.md` | Generator | Same, but via a draft→critique→revise loop for higher-confidence output |
| `prompts/generate-api-routes.md` | Generator | Scaffolds standardized endpoints (typed contract, error envelope, auth/ownership, idempotency) |
| `prompts/security-review.md` | Generator | Runs the security checklist against a codebase in small reviewable batches |
| `rules/security-checklist.md` | Reference | Tiered pre-launch security checklist — attach when relevant |
| `rules/api-contract.md` | Reference | Stable API design: error envelope, validation at boundaries, pagination, idempotency |
| `rules/ui-anti-slop.md` | Reference | Overused AI-generated design patterns to avoid — attach when doing UI work |
| `rules/deployment-checklist.md` | Reference | Pre-launch gates: CI, staged rollout, rollback, post-deploy verification |
| `rules/mobile-performance-budget.md` | Reference | Measurable performance budgets for Expo/React Native apps |
| `skills/web-performance-audit/SKILL.md` | Skill | Read-only Lighthouse/browser audit of performance, SEO, accessibility, and responsive behavior — reports only, never fixes |
| `skills/supabase-migrations/SKILL.md` | Skill | Create/review Supabase migrations: RLS on every table, indexes, types, reversible changes |

## Steps

**1. New project?**
Run `prompts/start-new-project-prompt.md` (attach both reference docs) → paste the generated starter prompt into your coding session → it scaffolds the project and produces an initial `PROJECT_STATE.md`.

**2. Set up the AI's persistent tooling for this project**
Run either skills/agents/rules prompt against the new (or existing) codebase → it produces the actual convention files for whichever tool you're using (Claude Code, Cursor, Copilot, or a plain `AGENTS.md` for tools like opencode). These persist and get followed automatically in future sessions on this project.
- Use **generate-skills-agents-rules-agentic.md** when you trust one well-reasoned exploration pass.
- Use **generate-skills-agents-rules-loop.md** when getting it wrong would be costly and you want to see the AI check its own work.

**3. Every working session after that**
Run `prompts/project-continuation-prompt.md` → set "Goal for this session" to whatever you're doing (finish a feature, run a security pass, audit the codebase) → attach `rules/security-checklist.md` if the goal touches security, or `rules/ui-anti-slop.md` if the goal touches UI/UX → paste the generated prompt into your coding session → it updates `PROJECT_STATE.md` when done.

Use a performance/SEO/accessibility audit goal (same generator) before a launch-readiness check, same as the security pass — `skills/web-performance-audit/SKILL.md` diffs against any prior audit already recorded in `PROJECT_STATE.md`. Attach `rules/deployment-checklist.md` for the final launch check, `rules/mobile-performance-budget.md` for any mobile/Expo feature work, `rules/api-contract.md` (with `prompts/generate-api-routes.md` or `prompts/security-review.md`) when new endpoints are involved, and `skills/supabase-migrations/SKILL.md` whenever the session touches the database schema.

**4. Repeat step 3** for every session until the project is ready to ship. Use a scoped closeout continuation prompt (same generator, goal = "final launch check") to confirm everything's actually verified before calling it done.

**5. Periodic maintenance.** `PROJECT_STATE.md` accumulates entries session after session. Periodically (e.g. every 10–15 sessions, or whenever it gets unwieldy) archive completed/historical items into a separate `CHANGELOG.md` and trim `PROJECT_STATE.md` back down to current-state-only, so continuation sessions aren't re-reading the project's entire history each time. Also re-run the skills/agents/rules generator (step 2) if a continuation session notices the existing convention files have drifted from the actual code.

## Checklist
- [ ] Every project tracked by this library has a linked `PROJECT_STATE.md` committed in its own repo
- [ ] Convention files (`CLAUDE.md`/`AGENTS.md`/`.cursor/rules`) are re-generated whenever they drift from real code
- [ ] `PROJECT_STATE.md` gets trimmed/archived periodically instead of growing forever

## What this system covers vs. doesn't

**Covers:** keeping every AI session grounded in real, current project state instead of re-explaining from scratch each time; enforcing security and design standards structurally rather than from memory; producing a consistent, reviewable trail (`PROJECT_STATE.md`) of what's been done and verified.

**Doesn't cover:** the actual coding judgment, code review quality, or whether a proposed fix is correct — you still review every diff. Also doesn't cover task/ticket tracking across multiple projects or deployment pipelines; that would be a separate system if you want one later.

## Related
- Prompts: [[start-new-project-prompt]], [[project-continuation-prompt]], [[generate-skills-agents-rules-agentic]], [[generate-skills-agents-rules-loop]], [[generate-api-routes]], [[security-review]]
- Rules: [[security-checklist]], [[api-contract]], [[ui-anti-slop]], [[deployment-checklist]], [[mobile-performance-budget]]
- Skills: [[web-performance-audit]], [[supabase-migrations]]

---
Last updated: 2026-09-07
