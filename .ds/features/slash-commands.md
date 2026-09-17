---
name: Slash commands
area: Agent surface
code:
  - templates/commands/ds.md
  - templates/commands/bootstrap.md
  - templates/commands/update.md
uses: [Body vocabulary]
tests: [test/contract/invariants.test.js, test/ship/install.test.js]
stamp: sha256g:17b15f81b336f412
---

The prose that reaches the user's agent: exactly three commands, written once and read by every
adapter. **This is the product's real interface** — the only surface the user types — and the
product model behind it is never explained to the user at all.

**A slash command is not a separate kind of thing.** Every one of them is prose telling the agent
which `dspec` command to run and what to judge in its output; porting to a new agent is frontmatter
work rather than a rewrite.

Rules
- **Three commands and no skill.** In Claude Code and Cursor a skill is also a slash command, so a
  skill would be a fourth name in the menu. What a skill used to teach lives in the memory file's
  upkeep steps and in `dspec sync --guide`.
- **`/ds` writes nothing until the user approves the plan.** It understands the request against the
  model, describes it in detail — quoting every rule it breaks and naming what the model does not
  settle — plans the build, and stops. Only after approval does it build, test and update the model.
  Its tool list includes write tools, so this is instructed, never claimed as enforced.
- **Talk to the user in features and behaviour, never files.** The model is internal; no command
  asks the user to open, edit or understand it.
- **The model is kept current without asking.** `/ds-bootstrap` and the last step of `/ds` resolve
  every description older than its code — reading both, rewriting the description, accepting it —
  and describe new code. A description is never accepted unread.
- **A command never hard-codes another command's name.** Placeholders are resolved per agent at
  install time, so three agents cannot disagree about how a command is typed.
- **The vocabulary is never hand-written here.** `/ds-bootstrap` carries one generated line and
  points at `dspec sync --guide` for the rest.

Behaviour
- `/ds-bootstrap` **creates** the model when there is none — naming features by what they do, not
  by folder, and writing every description itself — and **brings it fully up to date** every time
  after, including removing a feature whose behaviour is gone from the code.
- `/ds` with no request summarises the features and anything outstanding; in a repository with no
  model it points at `/ds-bootstrap` and stops rather than setting a model up as a side effect.
- A command receives the whole request as `$ARGUMENTS`. `$1` is its first word only.
- `/ds-update` runs `dspec update` and then `dspec init --yes`, stops rather than working around an
  npm permissions error, and says the rebuilt commands take effect in a new session.
