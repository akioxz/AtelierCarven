---
name: web-performance-audit
description: "Audit a live website's performance, SEO, accessibility, page weight, and loading behavior with measured Lighthouse and browser evidence. Use when the user asks for speed scores, Core Web Vitals, or launch-readiness diagnostics; do not use to implement fixes."
---

# Web Performance Audit

Run a read-only audit of the supplied public URL. If no URL is supplied, infer one only from verified project configuration or ask the user.

## Evidence first

1. Inspect the repository for framework, metadata, image handling, client boundaries, and existing test commands. Note build-output evidence (e.g. bundle size/analysis from the project's own build command) as source-code evidence, alongside the live measurements below.
2. Run Lighthouse against the live URL when a compatible local browser is available. Request approval before downloading Lighthouse through `npx` or using external paid services. Save temporary reports outside the repository and remove them after extracting results.
3. Separately collect one fresh unthrottled browser sample for server response time, FCP, navigation milestones, resource count, transfer size, rendered metadata, image loading, headings, controls, and mobile overflow. Do not present this sample as a throttled Lighthouse score.
4. PageSpeed Insights, GTmetrix, and WebPageTest are optional corroboration. Use only providers that are reachable without login or payment. If a provider rate-limits, fails, or is unavailable, state that plainly and do not substitute empty values for scores.

## Audit scope

Evaluate only confirmed issues in these areas:

- **Performance:** FCP, LCP, TBT, CLS, Speed Index, interactive time, server response, resource count, page weight, unused JavaScript, render-blocking resources, main-thread work, image delivery, and client-boundary cost.
- **SEO:** title, meta description, canonical URL, Open Graph and Twitter metadata, indexability, robots, structured data, semantic heading order, and crawlable links.
- **Accessibility:** Lighthouse/axe findings against WCAG 2.1 AA as the baseline conformance target, contrast, accessible names, alt text, landmarks, focus and keyboard semantics, forms, reduced motion, and touch targets.
- **Responsive behavior:** test at a narrow mobile viewport and desktop viewport for horizontal overflow and major containment failures.

Do not infer field data or real-user Core Web Vitals from a lab run. Label all measurements with their source and conditions.

## Report format

Lead with a concise score table, then a metrics table. State whether Lighthouse used mobile emulation. Give every finding a P0-P3 severity, exact source location when it is code-verifiable, impact, and a specific remedy. Distinguish:

- measured live evidence;
- source-code evidence;
- unavailable or unverified production behavior.

Keep recommendations prioritized. Avoid speculative micro-optimizations when metrics are already strong. Mention positive results that should be preserved.

## Save results

After the audit, append a dated entry to this project's `PROJECT_STATE.md` (or equivalent state file) under a "Performance Audit" section — score table, top P0/P1 findings, and a date or session marker. If a prior audit entry already exists there, diff against it explicitly (improved / regressed / unchanged, per metric) rather than presenting this as an isolated snapshot. Re-run after any major feature addition or before a launch-readiness check.

## Boundaries

This skill audits and reports only. Never modify source code, install project dependencies, commit, push, deploy, alter hosting settings, or submit forms. Ask before any follow-up implementation.

## Related (dev-library cross-links)
- Prompts: invoked via the "performance/SEO/accessibility audit" goal in project-continuation-prompt.md
- Workflows: ai-development-workflow-map.md
