# Prompt: Generate Skills, Agents, Rules & Context Files (Loop / Self-Critique)

## Purpose
Have the AI draft the skills/agents/rules/context files, then critique its own draft against explicit criteria, fix what it finds, and repeat — rather than presenting a first-pass answer. Trades speed for higher confidence that the files are complete, non-contradictory, and correctly scoped. Best for projects where mistakes would be costly to unwind later (e.g. an agent given the wrong tool permissions, a rule that quietly contradicts another rule), or when you want a second/third pass of quality checking without doing it yourself.

Tool-agnostic — same detection step as [[generate-skills-agents-rules-agentic]]: the prompt asks which AI coding tool(s) you use before producing anything, since file formats differ.

Use this **LOOP** version when getting it wrong would be costly. Use the plain [[generate-skills-agents-rules-agentic]] version when you trust a single well-reasoned pass.

## The prompt
```
You are producing a complete set of skills, agents, rules, and context files
for this project. Instead of giving me a single first-pass answer, work in a
draft → critique → revise loop, and only show me the final result once it
passes your own critique cleanly or you've completed 3 revision passes,
whichever comes first. Show me the full loop, not just the final answer —
I want to see what you caught and fixed.

FIRST — before drafting anything:
Ask me which AI coding tool(s) this is for (Claude Code, Cursor, GitHub
Copilot, or another/multiple), unless existing files in the repo already
make it obvious. Confirm before proceeding.

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

Also gather from me, briefly:
- A short description of the project (or point me to a context file I
  already have, like a PROJECT_STATE.md or copilot-instructions.md, if one
  exists — read it rather than asking me to repeat it)
- Anything I already know I want codified as a rule, skill, or agent
- Any existing conventions in the codebase I should ground this in

THEN run the loop:

DRAFT — produce a first version of:
1. A context file (project purpose, stack, architecture, current state,
   conventions)
2. Rules (persistent constraints — coding style, what must never change,
   security baseline, design constraints)
3. Skills (reusable definitions for repeatable tasks in this project, each
   with a trigger condition, the steps involved, and what "done" looks like)
4. Agents, only if a genuinely distinct role/scope justifies one (state your
   reasoning if you propose any; state explicitly if you conclude none are
   needed)

CRITIQUE your own draft against these criteria — check each one explicitly,
don't just assert it passes:
- Grounded: is every rule/skill/agent based on something actually true about
  this project, not a generic best-practice inserted without basis?
- Non-contradictory: does any rule conflict with another, or with something
  already in the codebase's existing conventions?
- Correctly scoped: is each skill genuinely reusable (not a one-off task
  disguised as a skill)? Does each agent have a real, distinct boundary (not
  overlapping with another agent or with general assistance)?
- Complete: are there obvious repeatable tasks or conventions in this project
  that were missed?
- Correct format: does the output match the actual file structure/format the
  detected tool expects?
- Actionable: could a fresh AI session with no other context follow these
  files and behave correctly, without needing to guess?

REVISE based on what the critique found. State specifically what you changed
and why.

Repeat the critique → revise step up to 2 more times if the critique still
finds real issues. Stop early if a full critique pass finds nothing to fix.

Then show me:
- The full loop (each critique's findings and each revision)
- The final files, ready to create in the correct locations for the detected
  tool
- A one-line note on anything you were unsure about and left as-is rather
  than guessing

Wait for my confirmation before actually creating the files.
```

## Usage notes
1. Paste this prompt into a session with access to your project (description, uploaded files, or direct repo access).
2. Answer the tool-detection and context-gathering questions.
3. Read through the shown loop — this is where you'll catch anything the AI's self-critique missed, or disagree with a call it made.
4. Confirm before it writes the actual files.
5. Re-run either version whenever a continuation session notices the existing rules/skills/context files contradict the current code — generated conventions can go stale as the project evolves, and nothing else in this workflow re-checks them automatically.

## Changelog
- v1 — imported into dev-library from original meta-prompt set.

## Related
- Prompts: [[generate-skills-agents-rules-agentic]], [[project-continuation-prompt]], [[start-new-project-prompt]]
- Workflows: [[ai-development-workflow-map]]

---
Last updated: imported this session
