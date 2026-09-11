---
name: Slash commands and skill
area: Agent surface
code:
  - templates/commands/bootstrap.md
  - templates/commands/spec.md
  - templates/commands/plan.md
  - templates/commands/sync.md
  - templates/skills/ds/SKILL.md
uses: [Body vocabulary]
tests: [test/contract/invariants.test.js]
stamp: sha256f:a872fa9b506ce4aa
---

The prose that reaches the user's agent: four commands and one skill, written once and read by
every adapter. **This is the product's real interface.** dspec is a toolkit and the agent is the
brain, so everything else here only measures — these files are what turn a measurement into a
decision somebody acts on.

**A slash command is not a separate kind of thing.** Every one of them is prose telling the agent
which `dspec` command to run and what to judge in its output; the agent runs it like any other
shell command. That is why an agent which has only read the skill can do all of this with no slash
command installed, and why porting to a new agent is frontmatter work rather than a rewrite.

Rules
- **A command's tool list is its fence, and it is the only instruction anybody actually enforces —
  in the one agent that has one.** The spec command ships with no write tool, so under Claude Code
  it *cannot* leave the model describing something that does not exist yet. Codex and Cursor honour
  no tool list, so there the prose says plainly that the restraint is the reader's own. Claiming
  the mechanism in prose that all three receive was a statement true in one agent and false in two.
- **A command never hard-codes another command's name.** Placeholders are resolved per agent at
  install time, so three agents cannot end up disagreeing about how a command is typed. A
  hard-coded name is a second spelling that goes stale on its own.
- **The vocabulary is never hand-written here.** It is injected from its single declaration, so a
  surface teaching the language cannot drift from what the linter enforces.
- **Ask, do not infer.** Where the model is thin, the instruction is to ask the user rather than to
  fill the gap from the code, from naming, or from convention — that guess is exactly what the whole
  system exists to prevent.
- **Boundary and scope decisions belong to the user.** Proposing is the command's job; deciding is
  not.

Behaviour
- `bootstrap` **creates** and `sync` **repairs** — different intentions, so different commands.
  Running the wrong one buries a curated model under proposals, or leaves a missing one missing.
- Describe → plan → build → reconcile. Only the last step writes to the model, and it is offered
  after the code exists rather than before.
