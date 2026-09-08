# Prompt: Start New Project

## Purpose
Generate a single, self-contained starter prompt for scaffolding a brand new project from scratch — with security baseline and design taste built in from day one, not bolted on later. Attach [[security-checklist]] and [[ui-anti-slop]] alongside this prompt when using it.

## The prompt
```
You are helping me create a "project starter prompt" — a single, self-contained
prompt I can hand to an AI coding assistant to scaffold a brand new project from
scratch. Assume the AI reading the final prompt has no other context beyond what
the prompt says and the two attached reference files (SECURITY-CHECKLIST.md and
UI-ANTI-SLOP.md).

Gather the following from me — ask if anything is missing, don't guess or invent:

1. PROJECT OVERVIEW
   - Project name and one-sentence description of what it does and who it's for
   - Target platform (web, mobile, both)
   - Whether it handles payments, user accounts/auth, file uploads, or AI/LLM
     features — this determines which checklist tiers apply

2. STACK AND ARCHITECTURE
   - Preferred language/framework, if I have one (otherwise ask the AI to
     recommend one fitting the project type)
   - Database and hosting preference, if decided
   - Any services I already know I want to use (auth provider, email, payments,
     etc.)
   - Testing approach for this project (unit test runner, browser/e2e
     framework if applicable) — decide this now rather than retrofitting it
     after the first working version exists

3. DESIGN DIRECTION
   - Overall tone/aesthetic I want (in my own words — moody, playful, minimal,
     brutalist, etc.)
   - Reference sites/apps I like, if any
   - Explicit instruction: consult the attached UI-ANTI-SLOP.md and avoid every
     pattern on it; make deliberate design choices instead of default ones

4. SECURITY BASELINE
   - Explicit instruction: apply Tier 1 of the attached SECURITY-CHECKLIST.md
     from the very first commit, not as a later pass
   - Apply Tier 2 sections relevant to the features named in step 1 (skip
     Payments/AI sections if not applicable) before considering any feature
     "done," not just before final launch
   - Apply Tier 3 if this is a mobile app

5. INITIAL SCOPE
   - The minimum feature set for a first working version (be specific — don't
     let the AI invent scope I didn't ask for)
   - What's explicitly out of scope for this first pass

6. WORKING AGREEMENT
   - Work in small, reviewable batches — scaffold one piece, show me the
     result/diff, wait for confirmation before continuing, rather than
     generating the entire project unreviewed in one pass
   - Never claim a check (security or otherwise) passed without actually
     running/verifying it; show real output
   - At the end of the first working version, produce a PROJECT_STATE.md file
     summarizing what was built, what's still pending, and any decisions made
     — so this becomes the seed for future continuation prompts. Stamp this
     first entry with a date or "Session 1" so later continuation sessions
     can append to it as a dated sequence rather than one undifferentiated
     block

Once you have this information, output the final starter prompt in a single
markdown code block, written in second person ("You are starting a new
project...") so it can be pasted directly into a new session alongside the two
attached reference files. Structure it with clear headers matching the six
sections above. Keep it dense and factual — no filler. End the prompt with an
explicit instruction telling the AI what the very first step should be
(typically: confirm the stack choice and scaffold the project skeleton before
writing any feature code).
```

## Usage notes
1. Paste the prompt above into a chat, along with [[security-checklist]] and [[ui-anti-slop]] attached.
2. Answer the AI's questions about your new project specifically and honestly.
3. You'll get back a ready-to-paste starter prompt.
4. Use that starter prompt (with the two reference files still attached) in the session where you actually build the project.
5. Once the first working version exists, save the `PROJECT_STATE.md` it produces into the repo — that becomes your input for [[project-continuation-prompt]] going forward.

## Changelog
- v1 — imported into dev-library from original meta-prompt set.

## Related
- Rules: [[security-checklist]], [[ui-anti-slop]]
- Prompts: [[project-continuation-prompt]], [[generate-skills-agents-rules-agentic]], [[generate-skills-agents-rules-loop]]
- Workflows: [[ai-development-workflow-map]]

---
Last updated: imported this session
