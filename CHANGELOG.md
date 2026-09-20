# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). The command surface, the
`.ds/` file format and the exit-code contract are what the major version covers: a breaking change
to any of them takes a major bump.

## [Unreleased]

**dspec is a map, not a method.** Everything that made it a workflow is gone. What is left is the
part that was always the point: `.ds/` holds what your codebase is and where it lives, and every
agent reads it instead of searching your repository.

### Upgrading from 0.1.x

```
npm i -g dspec@latest
dspec init       # in each repo
```

One `init` removes every trace of the old version — the retired commands, the hook scripts, and the
hook entries the old version put in `.claude/settings.json`. Nothing you wrote is touched. Start a
new agent session afterwards.

Your existing `.ds/` still reads perfectly well; `stamp:`, `entry:` and `tests:` are simply ignored
now. Run `/ds-bootstrap` when convenient to bring it to the simpler format.

### Removed

- **`/ds`** — the spec → plan → approve → build loop. dspec imposes no way of working.
- **`/ds-update`** — upgrading is `npm i -g dspec@latest && dspec init`.
- **The session hooks.** All three, and with them every write to `.claude/settings.json`.
  `CLAUDE.md` / `AGENTS.md` is read by every agent at session start, which is enough, and is the
  same for all three agents rather than a Claude-only advantage.
- **`dspec sync`, `dspec spec`, `dspec accept`, `dspec update`.** `dspec init` is the whole CLI.
- **All measurement** — code fingerprints (`stamp:`), drift detection, coverage gaps, the quality
  linter, the work list and the `--strict` gate.
- **`.ds/config.json`**, the `<!-- ds: project="…" -->` artifact stamp, and `dspec sync --guide`.
- **Every network call.** dspec now makes none at all, under any command.

### Changed

- **One command in every agent: `/ds-bootstrap`.** It builds the map, or brings it up to date —
  the same command the first time and every time after.
- **`CLAUDE.md` / `AGENTS.md` is no longer generated from the model.** dspec writes a fixed
  instruction block between `<!-- ds:begin -->` and `<!-- ds:end -->` and touches nothing else. A
  `CLAUDE.md` that 0.1.x generated in full is replaced by that block on upgrade, since none of it
  was ever yours.
- **The `.ds/` format is simpler.** Frontmatter is `name`, `area`, `code`, `uses`; the body is
  ordinary markdown with `## Rules` and `## Behaviour`. `stamp:`, `entry:` and `tests:` are gone,
  and the glossary is a section of `product.md` rather than a file. Nothing parses any of it.
- **`.ds/index.md` is written by the agent**, not rendered by the CLI.
- **`dspec init` never reads or creates `.ds/`.** It installs, and that is all it does.

## [0.1.0] — 2026-09-17

Three commands, and a product model you never have to think about.

### Upgrading from 0.0.x

```
dspec update     # or: npm i -g dspec@latest
dspec init       # in each repo
```

`dspec init` removes `/dspec-sync`, `/dspec-spec`, `/dspec-plan`, `/dspec-update` and the `dspec`
skill (or 0.0.1's `/ds-*`) and installs the three new commands. Start a new agent session afterwards.

### Changed
- **Breaking: the session has exactly three commands** — the same in Claude Code, Codex and Cursor:
  - **`/ds-bootstrap`** builds the product model the first time and brings it fully up to date every
    time after. The agent names features, writes their descriptions and resolves everything the
    model no longer agrees with on its own, then reports what it did.
  - **`/ds {what you want}`** is the whole spec-driven loop: a detailed description checked against
    the product's rules, a build plan, then **it stops for your decision**. On approval it builds,
    runs the tests and updates the model.
  - **`/ds-update`** runs `dspec update` and `dspec init` from inside the session.
- **No skill is installed.** In Claude Code and Cursor a skill is also a slash command; what it taught
  now lives in the memory file and in `dspec sync --guide`.
- **The agent keeps the model current by itself.** Every memory file carries the upkeep steps: after
  any change, read each description that is older than its code, rewrite it, `dspec accept`; claim
  or describe new code. In Claude Code the Stop hook enforces it: when the model is behind the code,
  the agent is asked — once per turn, never in a loop — to bring it up to date before it finishes.
  Code that was undescribed before the work is left to `/ds-bootstrap`.
- **The model is internal.** No document describes its format; the README talks about features and
  commands only.
- **Ownership is a mark, not a name.** Every installed file carries `dspec:managed`, and `dspec init`
  deletes only marked files (plus `.claude/hooks/dspec/` and older installs). A `ds-deploy.md` of your
  own is never touched.

### Added
- **`dspec sync --guide`** prints how to write the model — what an agent reads before it writes one.
- **`dspec sync --json`** reports `changedUnclaimed`: source files added or modified in the working
  tree that no feature claims.

## [0.0.3] — 2026-09-17

### Fixed
- **`dspec update` could refuse a real global install as "not a global npm install".** It compared
  its own path with the output of `npm root -g`, and npm hides any path segment that looks like a
  UUID (`***`), so the two never matched under such a directory. A global install is now recognised
  by the layout npm creates (`<prefix>/lib/node_modules/dspec` with `<prefix>/bin/dspec`), and the
  update installs with `--prefix` into exactly that prefix, so it cannot land in a different one.
- The first `dspec sync --write` in a repo with no model says it **created** `.ds/product.md` and
  `.ds/glossary.md`, not that it restored them.

## [0.0.2] — 2026-09-15

Fixes for the two ways 0.0.1 could quietly break its own promise: a first `sync --write` could
overwrite your `CLAUDE.md`, and every `sync --write` erased drift before it was reported. And
updating dspec now actually updates what it installed.

### Upgrading from 0.0.1

```
npm i -g dspec@latest     # once — from now on, `dspec update`
dspec init                # in each repo
```

The slash commands are now **`/dspec-sync`, `/dspec-spec`, `/dspec-plan`** and the new
**`/dspec-update`**. `dspec init` removes the 0.0.1 install (`/ds-*`, `.claude/skills/ds/`, hooks
directly in `.claude/hooks/`) and writes the new one. Start a new agent session afterwards.

### Added
- **`dspec update`** checks the installed dspec against the latest on npm and installs the newer one
  (global installs; `--check` only reports). It is the only dspec command that uses the network, and
  only when you run it.
- **`/dspec-update`** does the same from inside an agent session: `dspec update`, then
  `dspec init --yes`.
- **`dspec accept "<Feature>"… [--all]`**. Run it after reading a drifted feature and its code. It
  re-stamps only the features you name, and it is the only command that clears *"description older
  than code"*.
- **A managed block in an existing `CLAUDE.md` or `AGENTS.md`.** If you already have one, dspec now
  writes only a block between `<!-- ds:begin -->` and `<!-- ds:end -->`. Every other byte of the file
  is left as it was.

### Changed
- **Breaking: every installed name carries the `dspec` prefix.** Commands are typed `/dspec-sync`,
  `/dspec-spec`, `/dspec-plan` and `/dspec-update` in Claude Code, Codex and Cursor. The skill is
  `dspec`, and Claude's hooks live in `.claude/hooks/dspec/`.
- **`dspec init` rebuilds, instead of only adding.** Every run deletes everything dspec installed —
  every `dspec`-prefixed command, skill and hook, and dspec's own entries in `.claude/settings.json`
  — and writes it again from the installed version, so an upgrade leaves nothing out of date and
  nothing a newer version dropped. Nothing without the prefix is written or removed, and the user's
  own hooks in `settings.json` are kept. An existing `hooks` key no longer stops dspec's hooks from
  being wired. `dspec init --yes` with no `--agent` rebuilds the agents already installed. An agent
  that was installed and is not chosen again is removed, except Codex, whose prompts in the home
  directory are shared by every repo.
- **`.ds/config.json` is rewritten on every `init`**, since the CLI path and version change on upgrade.
- **`dspec bootstrap` is gone — `dspec sync` now creates the model too.** `dspec sync --write`
  creates `.ds/` and proposes one provisional feature per directory of source the first time it
  finds no model, and repairs it every time after; which of the two it does is read from the
  checkout, never typed. The CLI drops from four verbs to three (`init`, `sync`, `spec`), and the
  slash commands from four to three (`/ds-sync`, `/ds-spec`, `/ds-plan`). `dspec sync` no longer
  accepts a `<dir>` argument, `--here`, `--force` or `--no-git`, and no longer runs `git init` or
  appends a `.gitignore` line for `.ds/config.json` — it only ever acts on the repo already at the
  current directory.
- **`dspec sync --write` no longer re-stamps a feature whose code changed.** That feature stays
  stale and is listed until `dspec accept` names it. `--write` still stamps features that were never
  measured.
- **A new fingerprint generation, `sha256g:`.** Comments are now stripped only in the forms the
  file's own language uses. Before this, `#` counted as a comment in every language and `//` counted
  as one in Python, so real edits went unseen: a JS private field, a Rust attribute, a Python floor
  division, and everything after a `/*` inside a JS regex. Markdown and unknown file types keep their
  comments, and binary files are hashed byte for byte. **Existing stamps now read as *not measured*,
  and your next `dspec sync --write` re-measures them. It cannot tell you about drift that happened
  before the upgrade.**
- **Artifacts no longer carry a timestamp.** A second `sync --write` on an unchanged checkout
  writes nothing, and branches no longer conflict on line 1 of `.ds/index.md`.
- **`/ds-sync` starts with a dry run.** It reads each drifted feature, then accepts it. `/ds-spec`
  and `/ds-plan` now receive your whole request (`$ARGUMENTS`), not just its first word.
- **The session-stop reminder only fires for real drift.** It no longer fires for features that were
  never measured.
- **`npm run build` no longer emits source maps or type declarations,** so they are not in the
  published package.

### Fixed
- `dspec init` followed by `dspec sync --write` now proposes a model. `init` writes
  `.ds/config.json`, and `sync` used to read the bare `.ds/` directory as an existing model.
- A product name with a space, such as "Acme Shop", no longer makes every artifact read as copied
  from another project. Before this fix, `sync --strict` could never pass.
- `sync` now rejects mistyped flags. `--stirct` used to pass silently in CI, and `sync --help` used
  to run a sync. `--write --json` now prints valid JSON on stdout. `--brief --strict` is refused.
- When git cannot list the repository's files, `sync` says code coverage was not measured. It used to
  print "the model and the code agree". Files with non-ASCII names now count as source.
- An unreadable file is reported as unmeasured, instead of aborting the whole run.
- A value containing a comma or bracket inside `[…]` now survives a stamp rewrite. So does a number
  written with a leading zero, like `007`. Proposed features quote paths such as `app/[locale]/page.tsx`.

## [0.0.1] — 2026-09-11

Initial release. dspec is distributed on npm only — there is no Claude Code plugin or marketplace
listing.

```
npm i -g dspec
dspec init          # in any repo — pick your agents
```

dspec keeps a product model as markdown in `.ds/` — one file per feature, each declaring the files
it lives in and the features it depends on, each fingerprinted against the checkout.

- **Declared, not inferred.** `code:` and `uses:` are written by a person and verified by
  `dspec sync`: every path must exist, every name must resolve, every `entry:` must be declared in
  one of the feature's own files.
- **Retrieval is a lookup.** `dspec spec` resolves a name and never guesses from overlapping words.
  A request naming no feature is told so, and the index is printed to choose from.
- **Reconciliation runs both ways.** `dspec sync` reports descriptions whose code moved or changed,
  and source files no feature describes. `--write` only re-measures: it never rewrites a
  description and never deletes a feature.
- **Six lint rules**, chosen by one question — does this failure hide? A `uses:` typo silently
  costs an edge and is an error; an `area:` typo shows in the index and needs no rule.
- **`dspec init` is the only command a human has to type.** It asks which agents to set up and
  writes each one's files in its own syntax: `.claude/commands/ds-*.md` for Claude Code,
  `~/.codex/prompts/ds-*.md` for Codex, `.agents/skills/ds-*/SKILL.md` for Cursor.
- **The commands are typed the same way everywhere: `/ds-bootstrap`, `/ds-spec`, `/ds-plan`,
  `/ds-sync`.**
- **`dspec init` adds what is absent and never touches what is there.** Not a file, not a key, not
  a line, and there is no `--force`. A command file you already have is never replaced by a newer
  version of itself — delete the one you want refreshed and run `dspec init` again.
- **`AGENTS.md` is rendered alongside `CLAUDE.md`** when Codex or Cursor is installed. It carries
  one extra paragraph asking the agent to run `dspec sync --brief` when a session opens, because
  neither can run a command on a session event.
- **Three session hooks, Claude Code only**: a session opens knowing what the project owes, an edit
  surfaces the features claiming that file, and leaving with a stale model earns one reminder. All
  of them only add context and none can block a tool call.
- **No agent is promised a fence it does not have.** `/ds-spec` cannot write under Claude Code
  because its tool list forbids it; Codex and Cursor honour no tool list, and the prose they
  receive says the restraint is the reader's own.
- **`dspec --version` prints the number.** Upgrading is `npm i -g dspec@latest`.
- **A dependency in a context pack is a contract, not a whole feature.** Under *"What it uses"*
  each one carries its name, files, entry point, lead and rules, plus the command that fetches the
  rest — but not its behaviour, `uses:` or `tests:`. `--touch "<Feature>"` promotes a dependency to
  a full feature, and each contract prints that command.
- **An agent's own directory is never counted as undescribed source.** `.claude`, `.agents`,
  `.cursor`, `.codex`, `.gemini`, `.github`, `.vscode` and `.idea` are configuration for the tools
  around a product, never the product.

Only `dspec bootstrap` and `dspec sync` write to `.ds/`, and only `dspec sync --strict` exits
non-zero.
