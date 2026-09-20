---
name: Agent adapters
area: Setup
code:
  - src/agents.ts
uses: [Managed install]
---

The one place in dspec where anything is agent-specific. An adapter says where this agent's command
file goes, what frontmatter it reads, which memory file it opens at session start, and how to
recognise an install of dspec — its own and older versions'. Start at the `Agent` interface.

## Rules

- **An adapter never holds prose.** The instructions are in `templates/`, written once; three
  copies would be three chances for Cursor to be taught something Claude was not.
- **The templates carry no frontmatter; the adapter prepends its own.** Shipping frontmatter and
  rewriting it per agent is what an entire YAML parser used to exist for, to translate three keys.
- **Nothing guesses whether somebody uses an agent.** Adapters once carried a `detect` that looked
  for `.claude/` or `.cursor/`; it existed only to preselect a picker, and a directory's presence
  was never evidence either way. `marker` answers a different and answerable question — did dspec
  put a file here — and is the only thing left.
- **Promise no restriction the agent does not enforce.** Only Claude Code honours `allowed-tools`,
  so only Claude Code is given one. Claiming a guarantee that is not there is worse than claiming
  nothing.
- **One command, one spelling everywhere: `/ds-bootstrap`.** Nothing is installed for one agent
  that cannot be installed for all three — which is why there are no session hooks, though Claude
  Code alone could run them.

## Behaviour

- Three adapters: Claude Code (`.claude/commands/`, reads `CLAUDE.md`), Codex CLI
  (`$CODEX_HOME/prompts/`, reads `AGENTS.md`), Cursor (`.agents/skills/<name>/SKILL.md`, reads
  `AGENTS.md`).
- Codex is the one adapter that writes outside the repository, because Codex reads prompts only
  from the home directory. The two consequences — a teammate who clones gets nothing, and a second
  `init` elsewhere finds the file already there — are reported to the user, not hidden.
- Frontmatter per agent: Claude gets `description` and `allowed-tools`; Codex gets `description`
  alone, the only key besides `argument-hint` it documents; Cursor gets `name` first, because a
  skill is addressed by its name and a reader scanning the directory should meet it first.
- `owned()` lists what the install occupies now; `legacy()` lists what an older dspec left, found
  by its old `dspec-` prefix or, for the unmarked 0.0.1 files, by content. `init` deletes both.
- `.claude/hooks/dspec/` is listed unconditionally rather than mark-checked: nothing but dspec
  writes that directory name, and 0.1.x's hooks must go — this version deletes the scripts they
  point at, and a hook whose script is missing fails on every session start.
- `isInstalled` checks the current marker for dspec's mark, not merely for existence: somebody
  else's `ds-bootstrap.md` is not an install of ours, and treating it as one would have `init`
  delete and rewrite a file dspec has no claim on.
