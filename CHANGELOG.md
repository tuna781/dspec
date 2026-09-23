# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). What a version number covers
is the command surface, the `.ds/` file format and the exit-code contract.

**While dspec is 0.x, a breaking change to any of those takes a minor bump** — 0.2.x → 0.3.0 — and
the patch digit is for changes that break none of them. This says what the project has actually
done: 0.2.0 removed four commands, and calling that a major bump would have meant 1.0.0 for a tool
still working out its shape. From 1.0.0 onwards, breaking means a major bump.

## [0.5.0] — 2026-09-23

### Changed

- **A feature file points at a name, not only at a path.** `/ds-bootstrap` now asks that wherever
  the prose sends a reader to code — the lead paragraph, a behaviour bullet, a decision — it names
  the thing they can search for: a function, a route, an error message, a constant. An anchor lands
  the reader on the line rather than the file, and it survives that file being moved, which a path
  does not.

  An anchor has to be text the writer actually read in that file, so one search finds it. That is
  the same standard `code:` and `uses:` are already held to, and it is what makes the next part
  possible: reconciling an existing map now searches a feature's anchors before it reads anything,
  because an anchor that no longer appears is the cheapest signal there is that the code moved
  under the description. It does not say what is now wrong — it says where to read.

  `code:` itself is unchanged and stays bare paths, since those are what a search for a file's
  owner matches. Nothing else in the format changes, and an existing map stays valid: the next
  `/ds-bootstrap` adds anchors as it reconciles.

- **A feature file carries the day it was last checked.** `checked:` is the date somebody last read
  that feature's code and stood behind the page — written when the file is written, and again
  whenever the code is re-read, including when nothing needed changing. That last case is the point:
  it is the only way the map tells *looked at and still true* apart from *never looked at*.

  Nothing reads the date, nothing enforces it, and nothing goes red as it ages, which is what
  separates it from the code fingerprints 0.2.0 removed. It is there so a reader can weigh a page
  before acting on it. The rule beside it does the work: a date is never moved forward for a page
  nobody opened, because an old date is honest about what it does not know and a fresh one is a
  claim. It stays in the frontmatter and never reaches the index.

- **A diff now names the features it can invalidate.** The instruction block already asked for a
  lookup before an edit — find the feature that owns the file, update its page after. It now asks
  for the same lookup in bulk when reviewing: look a diff's changed paths up in `.ds/features/` to
  name the features it touches, then read those pages for the rules it must not have broken.

  This is a read, not a command. No verb, no gate, and nothing new to install — the reverse lookup
  was always possible, and nothing was using it at review time.

- **`.ds/files.md` is gone; searching the feature files replaces it.** It restated every `code:`
  path a second time — in this repository's own map, seventy-four lines that said nothing the
  feature files did not already say — and it had to be rewritten whole whenever a file moved, which
  is the most expensive maintenance operation the format had. A fact in two places is a fact that
  will be edited in one.

  `grep -rl "<path>" .ds/features/` answers the same question exactly, from the `code:` lists that
  were always the original. It cannot fall behind, because there is no longer a copy to fall
  behind. The instruction block asks for the search in all three places it used to name the file:
  before an edit, when reviewing a diff, and when you have a file and want its feature.

  **`/ds-bootstrap` deletes a `files.md` an older map left**, so an existing map is migrated by the
  next run and no stale copy survives to be believed. `code:` lists are unchanged — they were
  always where the paths lived.

## [0.4.0] — 2026-09-21

### Changed

- **Instructions live in `templates/` once, and the map stopped restating them.** Seven rules
  existed in two places: six of `templates/bootstrap.md`'s were transcribed into the *Map building*
  feature file, and `templates/memory.md`'s "the code wins" into *Map instructions*. Both copies
  were kept in step by hand, and only the template ships — so the map's copy could fall behind
  with nothing saying so.

  The transcriptions are deleted rather than moved. Those feature files now carry what a read of
  the template does not give: the constraints on changing it, what depends on it, and why it says
  what it says. `product.md` states the rule that keeps it that way, with one marked exception —
  the README's four trust claims, which are quotations that name their source and are checked
  against `templates/`.

- **`--agent` no longer uninstalls what it leaves out.** `dspec init --agent claude` deleted the
  install of any agent whose files lived in this repository and was not named — Cursor's command,
  and the `AGENTS.md` block if nothing else wanted it. Codex was already spared, because its
  command sits in the home directory and is shared by every repository on the machine.

  The flag reads as *install these*, and the deletion was a side effect with its only warning in
  `--help`. `--agent` now only ever adds: an agent left out is not planned, not rebuilt and not
  removed, wherever its files live. One who was already installed gets a line in the report saying
  it was left in place.

  The trade is stated rather than hidden: a narrowed run rebuilds only what it names, so a plain
  `dspec init` — which names all three — is what carries the clean-upgrade guarantee.

- **The `.ds/` format gains two sections, a `kind`, and a reverse index.** Feature files had
  `## Rules` and `## Behaviour` and nothing else, so the two kinds of content that did not fit
  went into them anyway. This repository's own map showed both: four features carried a rejected
  option or a post-mortem inside a rule, and one recorded two stale comments and an untracked
  directory under *Behaviour* — where the next session would have read a defect as intended
  design.

  Feature files now also carry **`## Decisions`** — the choice made once, what was rejected and
  why — and **`## Unsettled`**, what could not be settled from the code and what was found to
  contradict itself. Both are omitted when empty, and neither is a tracker: nothing reads them and
  nothing acts on them.

  Every feature declares **`kind: product`** or **`kind: repo`**. The old rule said a feature was
  only ever a capability of the product, and eight of this repository's fourteen are its
  packaging, tests, docs and release — knowledge an agent needs and the map wrote regardless. The
  index now leads with the product and puts the repository's own machinery under its own heading.

  **`.ds/files.md`** is new: which feature owns each file, one line each. `templates/memory.md`
  already told agents to update the feature file claiming the code they touched, without
  supplying any way to find it — and by fourteen features that lookup had stopped being possible
  by eye, with `.gitignore` owned by *Published package* and globs that cannot be matched. The
  index gives up its full file lists in exchange, naming only where a feature starts, so it stops
  growing faster than the map does.

  Existing maps still read correctly and are upgraded in place by re-running `/ds-bootstrap`.

- **dspec leads with the answer rather than its cost.** The README, the `package.json`
  description and `dspec --help` all opened with *"stop paying your agent to re-read your
  product"*. Cost is the consequence; the reason a map matters is that a search answers from files
  that share a word, and cannot recover *why* a feature refuses what it refuses — so the agent
  infers it, in the same confident voice as the parts it genuinely read, and nothing marks the
  inference as one.

  All three surfaces now say the same thing, and the README argues it from what the installed
  instructions actually make an agent do: nothing claimed from a name, nothing described unread,
  the map checks itself, the code wins. Those are quotes from `templates/`, not claims written for
  a README. The measured table stays, below that argument, and now says what it measures — time,
  tokens and cost, with no accuracy benchmark invented to fill the gap.

### Added

- **`.github/social-preview.html`**, the source for the card GitHub renders beside the
  repository's About. That card had advertised a "Claude Code plugin", a `stamp:` fingerprint and
  specs "measured against" the code since 0.1.x — a plugin, a fingerprint and a gate, all three
  deleted by 0.2.0, on the one surface a visitor sees first and nobody rereads.

  The PNG is now a screenshot of a file in the repository, so the next wording change is a text
  edit and the two cannot drift apart unnoticed.

## [0.3.1] — 2026-09-20

### Added

- **The README's recording is now two real Claude Code sessions, side by side.** The same question,
  in the same repository, once with `.ds/` committed and once without — left greps and opens every
  file that mentions the word, right reads the map index and opens the two files it names.

  The previous recording was a sequence of shell commands standing in for an agent. It argued the
  case; it did not show it. `demo/record-split.sh` and `demo/compose-split.sh` now record and join
  the two halves, and `demo/README.md` says what is and is not reproducible about them.

  Recording happens in a staging copy outside this repository, deliberately: Claude Code reads
  `CLAUDE.md` from every parent directory, so a session recorded inside `demo/` inherits dspec's
  own block and the no-map half goes looking for a map anyway — a broken comparison that still
  produces a plausible-looking gif.

- **The README carries measured numbers.** One question put to Claude Code twice, with and without
  the map: 45s and 127,814 tokens against 29s and 67,436. One run each on the 15-file fixture in
  `demo/shop`, which anyone can clone and re-run.

### Changed

- **The block dspec writes into `CLAUDE.md` / `AGENTS.md` now names the install command.** When the
  map needs rebuilding and `/ds-bootstrap` does not exist in the session, the agent is told to say
  so and to give the user `npm i -g dspec && dspec init`.

  This is the only path by which somebody who cloned a repository carrying a map — a teammate, a
  contributor — finds out what wrote it. `.ds/` itself stays unattributed: the index is read every
  session, so a credit there would be paid for on every turn. The fallback costs its ~25 tokens
  only where a repository already has a map that has fallen behind, which is the moment the tool is
  worth naming at all.

### Removed

- **`demo.gif`**, the scripted recording, replaced by `demo-split.gif`.

### Fixed

- **`npm run release` now dates the changelog heading itself.** `## [Unreleased]` becomes
  `## [<version>] — <today>`, in the release commit, alongside the version it writes into
  `package.json` and `package-lock.json`.

  `publish-release.js` takes the GitHub Release notes from `## [<version>]` and nowhere else, so a
  changelog still saying "Unreleased" failed at the very last step — after the push, with the tag
  already public. Both 0.2.0 and 0.3.0 were dated by hand between the release commit and the tag:
  one fact kept in step by hand, which is the drift `release.js` exists to stop.

  A section already headed by that version is left alone, so re-cutting a shipped tag keeps the day
  it shipped. A changelog with neither heading ends the run.

- **A failed release no longer leaves the tree half-written.** Every check now runs before anything
  is written. Previously a failure partway through left `package.json` bumped and uncommitted, so
  the next run refused with "uncommitted changes" — about a mess the previous run had made.

## [0.3.0] — 2026-09-20

### Changed

- **`dspec init` asks nothing.** It installs into every agent dspec supports — Claude Code, Codex
  CLI and Cursor — every time, in a terminal, a script or CI alike.

  The picker asked the user to predict which agents they, and every teammate, would reach for on
  this repository. The two mistakes it could make are not the same size: installing an agent
  nobody opens costs one markdown file, while leaving out the one they do open costs a session
  where `/ds-bootstrap` is simply missing and nothing says why. So the cheap mistake is now the
  default.

  `dspec init --agent claude` still installs for one agent only, and uninstalls any other that
  keeps its files in this repository.

### Removed

- **`--all` and `--yes`.** `--all` is what a bare `dspec init` now does, and there is no longer a
  prompt for `--yes` to skip. Both are rejected rather than silently ignored, so a script carrying
  one is told instead of quietly doing something else.
- The interactive picker, and the per-agent `detect()` that existed only to preselect it. Whether
  a `.claude/` directory exists was never evidence that somebody uses Claude Code.

## [0.2.0] — 2026-09-20

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
