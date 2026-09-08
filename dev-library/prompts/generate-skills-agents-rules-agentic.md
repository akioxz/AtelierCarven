# Prompt: Generate Skills, Agents, Rules & Context Files (Agentic/ReAct)

## Purpose
Have an AI autonomously explore your actual codebase, decide what it needs, and produce the skills/agents/rules/context files itself — planning and acting (reading files, checking existing conventions) rather than working from your description alone. Best for full-feature setup, projects where the AI benefits from seeing real code before deciding what makes sense, multi-file or multi-tool setups.

Tool-agnostic — the prompt asks the AI to detect or confirm which AI coding tool(s) you use (Claude Code, Cursor, GitHub Copilot, etc.) before producing anything, since the file formats differ:
- Claude Code → `SKILL.md` files under `.claude/skills/`, subagent definitions, `CLAUDE.md`
- Cursor → `.cursor/rules/*.mdc`
- GitHub Copilot → `.github/copilot-instructions.md`
- Generic/other (including tools like opencode that read a plain `AGENTS.md`) → a plain context/conventions markdown file

Use this **AGENTIC** version when you trust a single well-reasoned exploration pass. Use [[generate-skills-agents-rules-loop]] instead when getting it wrong would be costly and you want to see the AI check its own work.

## The prompt
```
You are acting as an autonomous engineering agent. Your goal is to produce a
complete set of skills, agents, rules, and context files for this project by
exploring the actual codebase yourself — not by asking me to describe it to
you first. Use a Reason + Act loop: before each action, briefly state what
you're about to check and why; after each action, state what you learned and
what you'll check next. Do this until you have enough grounded information to
produce accurate, project-specific files.

FIRST — before anything else:
Ask me which AI coding tool(s) this is for (Claude Code, Cursor, GitHub
Copilot, or another/multiple), unless you can already tell from files already
present in the repo (e.g. an existing .cursor/ folder, .claude/ folder, or
.github/copilot-instructions.md). Confirm your detection with me before
proceeding rather than assuming.

Once confirmed, use this exact file/folder convention for the detected tool
— do not invent a different structure:
- Claude Code → `SKILL.md` files under `.claude/skills/<skill-name>/`,
  subagent definitions under `.claude/agents/`, and a top-level `CLAUDE.md`
  for the context file
- Cursor → rule files under `.cursor/rules/*.mdc`, and a top-level context
  file (e.g. `.cursor/rules/000-context.mdc` or a plain README section) —
  Cursor has no separate "skill" or "agent" concept, so fold reusable-task
  and role guidance into rules
- GitHub Copilot → a single `.github/copilot-instructions.md` covering
  context, rules, and reusable-task guidance together — Copilot has no
  separate skill/agent file format
- Generic/other or multiple tools → a plain `AI-CONTEXT.md` (or equivalent
  name I confirm with you) covering all four categories in one file

THEN — explore the codebase using available tools before writing anything:
- Read the directory structure to understand how the project is organized
- Identify the tech stack, frameworks, and key dependencies from package
  manifests
- Read any existing convention files, READMEs, or docs already in the repo —
  do not duplicate or contradict what's already documented; extend it
- Identify recurring patterns worth codifying as rules (naming conventions,
  file organization, error handling style, auth patterns, etc.)
- Identify distinct, repeatable tasks in this project that would benefit from
  being defined as a "skill" (e.g. "adding a new API route," "adding a new
  admin action," "writing a migration") — a skill should be reusable, not a
  one-off instruction
- Identify whether this project would benefit from specialized agents (e.g. a
  security-review agent, a UI-review agent, a test-writing agent) versus one
  general-purpose assistant — only propose agents where a genuinely distinct
  role/scope is justified, not for their own sake
- Note the current state of the project (what's built, what's in progress)
  for the context file

PRODUCE, in the format appropriate to the detected tool:

1. CONTEXT FILE — a single file summarizing: project purpose, tech stack,
   architecture/file organization, current state, key conventions already in
   use, and where to find things. This is the file a fresh AI session should
   read first.

2. RULES — persistent constraints and conventions the AI should always
   follow in this project (coding style, what must never change, security
   baseline, design constraints). Ground every rule in something you actually
   observed in the codebase or that I explicitly told you — do not invent
   generic best-practice rules unrelated to this project.

3. SKILLS — reusable, well-scoped definitions for the repeatable tasks you
   identified. Each skill should state: when to trigger it, what steps it
   involves in this specific codebase, and what "done" looks like.

4. AGENTS (only if justified) — role-scoped agent definitions with a clear
   purpose, what tools/files they should have access to, and their
   boundaries (what they should NOT do or decide).

Before finalizing, show me a short summary of what you found and what you
plan to produce, and let me confirm or correct it before you write the actual
files. Then create the files in the correct locations/formats for the
detected tool, and tell me exactly what you created and where.

Ground everything in what you actually observed in this codebase. If you are
inferring something rather than having directly verified it, say so
explicitly rather than presenting it as fact.
```

## Usage notes
1. Paste this prompt into a session with access to your actual codebase (upload it, or run it in an environment where the AI can read the repo directly).
2. Answer its tool-detection question if it can't tell on its own.
3. Review the summary it shows before it writes files — correct anything off before it proceeds.
4. The resulting context file becomes a natural companion to your `PROJECT_STATE.md` / [[project-continuation-prompt]] workflow — keep both in sync going forward.
5. Re-run this prompt (or [[generate-skills-agents-rules-loop]]) whenever a continuation session notices the existing rules/skills/context files contradict the current code — don't let generated conventions silently go stale as the project changes.

## Changelog
- v1 — imported into dev-library from original meta-prompt set.

## Related
- Prompts: [[generate-skills-agents-rules-loop]], [[project-continuation-prompt]], [[start-new-project-prompt]]
- Workflows: [[ai-development-workflow-map]]

---
Last updated: imported this session
