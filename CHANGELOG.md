# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). The command surface, the
`.ds/` file format and the exit-code contract are what the major version covers: a breaking change
to any of them takes a major bump.

## [0.0.2] — 2026-09-13

Fixes for the two ways 0.0.1 could quietly break its own promise: a first `sync --write` could
overwrite your `CLAUDE.md`, and every `sync --write` erased drift before it was reported.

### Added
- **`dspec accept "<Feature>"… [--all]`**. Run it after reading a drifted feature and its code. It
  re-stamps only the features you name, and it is the only command that clears *"description older
  than code"*.
- **A managed block in an existing `CLAUDE.md` or `AGENTS.md`.** If you already have one, dspec now
  writes only a block between `<!-- ds:begin -->` and `<!-- ds:end -->`. Every other byte of the file
  is left as it was.

### Changed
- **`dspec bootstrap` is gone — `dspec sync` now creates the model too.** `dspec sync --write`
  creates `.ds/` and proposes one provisional feature per directory of source the first time it
  finds no model, and repairs it every time after; which of the two it does is read from the
  checkout, never typed. The CLI drops from four verbs to three (`init`, `sync`, `spec`), and the
  slash commands from four to three (`/ds-sync`, `/ds-spec`, `/ds-plan`). `dspec sync` no longer
  accepts a `<dir>` argument, `--here`, `--force` or `--no-git`, and no longer runs `git init` or
  appends a `.gitignore` line for `.ds/config.json` — it only ever acts on the repo already at the
  current directory. Existing installs keep their `.claude/commands/ds-bootstrap.md` (and Codex/
  Cursor equivalents) until deleted by hand; `dspec init` never removes a file.
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

- **dspec-lang**: four file kinds (`product.md`, `glossary.md`, generated `index.md`,
  `features/*.md`), seven frontmatter keys of which three are required, a lead paragraph and two
  body labels. The path of a feature file carries no meaning; `area:` is the only grouping.
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
