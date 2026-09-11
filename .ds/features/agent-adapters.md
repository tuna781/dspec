---
name: Agent adapters
area: Agent surface
code: [src/install/agents.ts, src/install/render.ts, src/install/apply.ts]
entry: plan
uses: [Body vocabulary, Slash commands and skill]
tests: [test/ship/install.test.js, test/contract/invariants.test.js]
stamp: sha256f:b9f7fce5088181f3
---

The one place anything is agent-specific. Claude Code, Codex and Cursor each read commands from a
different directory, name their frontmatter differently, and expand arguments differently — or not
at all. An adapter describes those differences and nothing else.

What it never contains is instructions. The prose lives once in `templates/`, and a new agent is
a description of where files go and what their frontmatter is called. Three copies of the prose
would be three chances for one agent to be taught something another was not.

Rules
- **One spelling in every agent: `/ds-<name>`.** Claude Code could give `/ds:sync` by nesting the
  files in `.claude/commands/ds/`, and deliberately does not. Somebody who moves between two agents
  must not have to remember which one takes a colon.
- **Never promise a fence the agent does not have.** `/ds-spec` must be unable to write, and in
  Claude Code the tool list enforces that. Codex and Cursor honour no tool list, so the prose there
  says the restraint is the reader's own. The sentence *"it has no `Write` or `Edit` tool for that
  reason"* was true in one agent and false in two, which is the failure `__DS_FENCE__` exists to
  stop — a stated guarantee that is not running is worse than no guarantee.
- **Where an agent has no argument variable, substitute prose.** Their variable syntaxes shift
  between releases, and an unresolved placeholder reaches the prompt as `${input:args}` — which an
  agent reads as a real variable and asks the user about.
- **The frontmatter an agent ignores is dropped, not left in.** A key nobody reads still reads to
  a human as a mechanism that is running.
- **Add what is absent, never touch what is there.** Every file goes through `addFiles`, which has
  two outcomes and no third. A JSON settings file is the single exception, because a `hooks` key
  has to be added to a file the user owns — and on a parse failure it writes nothing at all.

Behaviour
- Codex is the one adapter that writes **outside the repository**: its custom prompts load only
  from `$CODEX_HOME/prompts`. A teammate who clones gets nothing for Codex until they run
  `dspec init` themselves, and both consequences are printed rather than hidden.
- Cursor is given no session hooks and Codex none either, because neither can run a command on a
  session event. `AGENTS.md` carries a written instruction to run `dspec sync --brief` instead,
  and it is labelled as an instruction — a hook cannot be skipped and a paragraph can.
- Which agents are installed is answered by looking for a file only dspec would have written, not
  by a stored list. A `.claude/` directory means somebody uses Claude Code; it does not mean dspec
  is installed there.
