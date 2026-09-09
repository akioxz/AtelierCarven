# Rule: Deployment Checklist (Ship Without Regret)

A pre-launch/pre-deploy checklist co-opted from the rollout-plan discipline: CI gates, staged rollout, rollback, and observability. Attach before any launch-readiness review, and before any risky migration going live.

## CI gates (must pass before a release is buildable)

- [ ] Typecheck passes with zero errors
- [ ] Lint passes (no `any`, no unused imports)
- [ ] Unit + integration tests pass
- [ ] E2E smoke test on the release channel (not just local)
- [ ] Dependency audit clean (or every finding triaged and documented)
- [ ] Secrets scan — no committed keys/tokens, no `service_role` key in the bundle

## Build & artifact

- [ ] One authoritative lockfile, committed and used by CI
- [ ] Build is reproducible from a tagged commit (not "whatever is on main")
- [ ] Version number bumped and stamped into the artifact
- [ ] Source maps not publicly served; debug mode off

## Staged rollout

- [ ] Ship to a staging/canary group first; watch error rates before wider rollout
- [ ] Database migrations run forward-compatible with the previous app version (expand, then contract; never drop a column still read by the old build)
- [ ] Feature flags gate risky changes so a bad release can be disabled without redeploying

## Rollback

- [ ] Rollback procedure written and rehearsed before the release — don't write it during the incident
- [ ] A rollback is a full-fidelity downgrade: old artifact can run against the current schema, which means keeping schema changes backward-compatible for at least one release
- [ ] Pre-release backup verified restorable (test the restore, not just the backup job)

## Post-deploy verification

- [ ] Health checks pass on every instance/region
- [ ] Logs, metrics, and traces flowing to the observability system
- [ ] Alerting actually fires (test with a synthetic error) for: 5xx spikes, p95 latency, failed deploys, error-budget exhaustion
- [ ] Error/tracking dashboard checked within minutes of deploy, not the next day

## After a release rolls back or degrades

- [ ] Incident documented with what/why/impact, not just the fix
- [ ] Alert turned into an automated check if the incident type wasn't caught automatically

## Related
- Prompts: [[start-new-project-prompt]], [[project-continuation-prompt]]
- Rules: [[security-checklist]]
- Workflows: [[ai-development-workflow-map]]

---
Last updated: 2026-09-07