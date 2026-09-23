---
name: Agent adapters
area: Setup
kind: product
checked: 2026-09-23
code:
  - src/agents.ts
uses: [Managed install]
---

The one place in dspec where anything is agent-specific. An adapter says where this agent's command
file goes, what frontmatter it reads, which memory file it opens at session start, and how to
recognise an install of dspec — its own and older versions'. Start at the `Agent` interface; the
three adapters that implement it are gathered at the foot of the file in the `AGENTS` registry.

## Rules

- **An adapter never holds prose.** The instructions are in `templates/`, written once; three
  copies would be three chances for Cursor to be taught something Claude was not.
- **Promise no restriction the agent does not enforce.** Only Claude Code honours `allowed-tools`,
  so only Claude Code is given one. Claiming a guarantee that is not there is worse than claiming
  nothing.
- **One command, one spelling everywhere: `/ds-bootstrap`.** It is written once as `COMMAND` and
  reused as `INVOKE` wherever it is shown to somebody. Nothing is installed for one agent that
  cannot be installed for all three.
- **A location that leaves `plan()` must stay in `owned()`.** Otherwise an install that already has
  it keeps it forever — nothing will ever come back for a path dspec no longer writes.

## Behaviour

- Three adapters — the `claude`, `codex` and `cursor` objects: Claude Code (`.claude/commands/`,
  reads `CLAUDE.md`), Codex CLI (`$CODEX_HOME/prompts/`, reads `AGENTS.md`), Cursor
  (`.agents/skills/<name>/SKILL.md`, reads `AGENTS.md`).
- Codex is the one adapter that writes outside the repository, because Codex reads prompts only
  from the home directory — `codexPromptsDir()` is the whole of that difference, and it honours
  `CODEX_HOME` before falling back to `~/.codex`. The two consequences — a teammate who clones gets nothing, and a second
  `init` elsewhere finds the file already there — are reported to the user, not hidden.
- Frontmatter per agent, assembled by `frontmatter()` and stitched onto the template body by
  `commandFile()`: Claude gets `description`, `argument-hint` and `allowed-tools`; Codex gets
  `description` and `argument-hint`, the only two keys it documents; Cursor gets `name` first, because a skill is
  addressed by its name and a reader scanning the directory should meet it first. The sentence
  itself is the `DESCRIPTION` constant, so all three say the same thing. `ARGUMENT_HINT` offers
  the part of a large repository to map; it has no leading `[`, because the frontmatter is written
  unquoted and YAML would read one as a list. Cursor gets no hint — it documents no such key — and
  loses nothing, since the template reads the part from what the user wrote.
- `owned()` lists what the install occupies now; `legacy()` lists what an older dspec left, found
  by its old `dspec-` prefix (`oldPrefixed()`) or, for the unmarked 0.0.1 files, by content
  (`existingLegacy()`). The names those two hunt for are `LEGACY_COMMANDS`. `init` deletes both
  lists.
- Claude's `owned()` also sweeps `.claude/skills/` for marked `ds` / `ds-*` entries, and
  `LEGACY_HOOK_DIR` — `.claude/hooks/dspec/` — is listed unconditionally rather than mark-checked.
  This version writes to neither. `legacyHookCommands()` is the matching half: the command strings
  0.1.x put in `settings.json`, spelled out so they can be recognised and taken back out.
- `isInstalled` checks the current marker for dspec's mark, not merely for existence: somebody
  else's `ds-bootstrap.md` is not an install of ours, and treating it as one would have `init`
  delete and rewrite a file dspec has no claim on.

## Decisions

- **The templates carry no frontmatter; the adapter prepends its own.** Shipping frontmatter and
  rewriting it per agent is what an entire YAML parser used to exist for, to translate three keys.
- **Nothing guesses whether somebody uses an agent.** Adapters once carried a `detect` that looked
  for `.claude/` or `.cursor/`; it existed only to preselect a picker, and a directory's presence
  was never evidence either way. `marker` answers a different and answerable question — did dspec
  put a file here — and is the only thing left.
- **No session hooks, though Claude Code alone could run them.** One spelling everywhere is worth
  more than a capability two of the three agents could not have.
- **`.claude/skills/` and `.claude/hooks/dspec/` are swept although nothing writes them.** An
  earlier version installed to both, and 0.1.x's hooks must go — this version deletes the scripts
  they point at, and a hook whose script is missing fails on every session start. Nothing but dspec
  writes that hooks directory name, which is why it needs no mark check.
