---
name: Agent adapters
area: Agent surface
code: [src/install/agents.ts, src/install/render.ts, src/install/apply.ts]
entry: plan
uses: [Body vocabulary, Slash commands]
tests: [test/ship/install.test.js, test/contract/invariants.test.js]
stamp: sha256g:7048f8c26e07fe7a
---

The one place anything is agent-specific. Claude Code, Codex and Cursor each read commands from a
different directory, name their frontmatter differently, and expand arguments differently — or not
at all. An adapter describes those differences and nothing else.

What it never contains is instructions. The prose lives once in `templates/`, and a new agent is
a description of where files go and what their frontmatter is called. Three copies of the prose
would be three chances for one agent to be taught something another was not.

Rules
- **Three commands, one spelling in every agent: `/ds`, `/ds-bootstrap`, `/ds-update`.** Somebody
  who moves between two agents must not have to remember which one takes a colon. No skill is
  installed: in Claude Code and Cursor a skill is also a slash command.
- **Never promise a fence the agent does not have.** Codex and Cursor honour no tool list, so no
  command may state a tool restriction as a guarantee. The sentence *"it has no `Write` or `Edit`
  tool for that reason"* was once true in one agent and false in two.
- **Where an agent has no argument variable, substitute prose.** Their variable syntaxes shift
  between releases, and an unresolved placeholder reaches the prompt as `${input:args}` — which an
  agent reads as a real variable and asks the user about.
- **The frontmatter an agent ignores is dropped, not left in.** A key nobody reads still reads to
  a human as a mechanism that is running.
- **The `dspec:managed` mark is ownership, and ownership means rebuild.** Every installed file
  carries the mark. Each adapter lists what its install occupies — every `ds`/`ds-*` entry that
  carries the mark, plus `.claude/hooks/dspec/` — and `rebuild` deletes all of it before writing the
  new version. The names are short enough that a user may own a `ds-deploy.md`, so the name alone
  proves nothing; without the mark a file is never removed.
- **An install from 0.0.2 – 0.0.3 is removed by its `dspec-` prefix**, which nothing else uses.
- **An install from 0.0.1 is removed only when it is recognisably dspec's.** Its names
  — `ds-sync.md`, `stop.js` — are ones a user could also have chosen, so each is checked first for a
  sign only dspec's files carry: the word dspec, the `.ds/` directory, one of its old `/ds-*`
  commands, or its hook helper. A look-alike is kept. The word alone was not enough — checked against
  the published 0.0.1 package, its `ds-plan` prompt for Codex and Cursor never says "dspec", and it
  survived the upgrade.
- **In `settings.json`, only dspec's own hook entries are replaced.** They are matched by the exact
  command dspec writes; the user's hooks keep their place and run first, every other key is kept,
  and on a parse failure nothing is written at all.

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
