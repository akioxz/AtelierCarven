# Prompt: Project Continuation

## Purpose
Generate a new, self-contained prompt that lets another AI (or a future session with no memory of this one) pick up exactly where you left off on a project — including full codebase audits and security passes, which are just specific goals within this same structure. Covers five use cases with one template: finishing a specific in-progress task, a full codebase audit, a security pass, a performance/SEO/accessibility audit, and UI/UX work — the difference is only what goes in "Goal for this session" and which reference file (if any) is attached.

Attach [[security-checklist]] if this session's goal is a security review. Attach [[ui-anti-slop]] if the goal is UI/UX work. No extra file needed for a performance/SEO/accessibility audit — the [[web-performance-audit]] skill carries its own scope and report format.

## The prompt
```
You are helping me create a "continuation prompt" — a single, self-contained
prompt I can hand to an AI assistant (or paste into a fresh session) so it can
resume work on my project with zero prior context. Assume the AI reading the
final prompt knows nothing about this conversation, my codebase, or my goals
beyond what the prompt itself says (plus any reference file I attach alongside
it, such as SECURITY-CHECKLIST.md).

Gather the following information from me — ask if anything is missing, don't
guess or invent details:

1. PROJECT OVERVIEW
   - Project name and one-sentence description
   - Tech stack (languages, frameworks, key libraries, hosting/deployment)
   - Repository location and current branch/deployment status

2. CURRENT STATE
   - What has been built/completed so far (be specific — feature by feature)
   - What is currently broken, incomplete, or in progress
   - Known bugs or technical debt worth flagging
   - Current working-tree state (modified/untracked files) — note that this
     may be stale, and the AI must inspect it fresh rather than trust it. If
     inspection genuinely isn't possible (no repo access), the AI must say so
     explicitly rather than presenting old notes as current state
   - Instruct the AI: when it later updates PROJECT_STATE.md at the end of
     its session, stamp the new entry with a date or session number, and
     build on the latest existing entry rather than re-summarizing the
     project's whole history each time

3. GOAL FOR THIS SESSION
   - The specific task(s) I want done next
   - What "done" looks like for this task (acceptance criteria)
   - Priority order if there are multiple tasks
   - If the goal is a security review or audit: instruct the AI to work
     through the attached SECURITY-CHECKLIST.md, starting with Tier 1, then
     the Tier 2 sections relevant to this project's features, in small
     reviewable batches rather than all at once
   - If the goal is a full codebase understanding/audit (not tied to one
     task): instruct the AI to read the architecture, map out how major
     pieces connect, identify current state of completion per feature, and
     report findings before making any changes
   - If the goal is a performance/SEO/accessibility audit: instruct the AI to
     run the web-performance-audit skill against the live URL, respecting its
     read-only boundary (report only, no fixes without separate approval),
     and to check PROJECT_STATE.md for a prior audit entry to diff against
     rather than treating this as a first run
   - If the goal is UI/UX work: instruct the AI to consult the attached
     UI-ANTI-SLOP.md and avoid every pattern on it before making visual
     decisions

4. CONSTRAINTS & PREFERENCES
   - Coding style, conventions, or patterns already used in the project
   - Things that must NOT change (stable APIs, existing UI, other people's
     code)
   - Tools, libraries, or approaches to avoid
   - Performance, security, or compatibility requirements
   - Explicit instruction: never claim a test, check, or deployment verification
     passed without actually running/performing it — show real diffs and
     literal command output, not summarized claims

5. RELEVANT FILES/CONTEXT
   - Key files, folders, or modules the AI will likely need to touch
   - Environment variables or external services involved (names only, never
     actual secret values)
   - Any repo-specific convention files (e.g. copilot-instructions.md,
     .cursor/rules) the AI should read first and follow throughout
   - Links to relevant docs, tickets, or specs if they exist

6. OPEN QUESTIONS
   - Anything I'm unsure about or want the AI's input on before proceeding
   - Any explicit scope boundary (e.g. "do not begin the next item after this
     one; stop for confirmation")

Once you have this information, output the final continuation prompt in a
single markdown code block, written in second person ("You are continuing
work on...") so it can be copy-pasted directly into a new session. Structure
it with clear headers matching the six sections above. Keep it dense and
factual — no filler, no assumptions not stated by me. End the prompt with an
explicit instruction telling the AI what the very first step should be
(typically: inspect current repo/state before making any edits).
```

## Usage notes
1. Paste the prompt above into a chat (attach [[security-checklist]] too if this session's goal touches security).
2. Answer the AI's follow-up questions about your project honestly and specifically.
3. You'll get back a ready-to-paste continuation prompt.
4. Save that output into the project's `PROJECT_STATE.md` (or update it there) so future sessions have a running record instead of you reconstructing context from scratch each time.

## Changelog
- v1 — imported into dev-library from original meta-prompt set.

## Related
- Rules: [[security-checklist]], [[ui-anti-slop]]
- Skills: [[web-performance-audit]]
- Prompts: [[start-new-project-prompt]], [[generate-skills-agents-rules-agentic]], [[generate-skills-agents-rules-loop]]
- Workflows: [[ai-development-workflow-map]]

---
Last updated: imported this session
