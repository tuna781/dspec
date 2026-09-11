# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). The command surface, the
`.ds/` file format and the exit-code contract are what the major version covers: a breaking change
to any of them takes a major bump.

## [Unreleased]

### Changed — dspec now works in Claude Code, Codex and Cursor

**Breaking.** dspec is distributed on npm and is no longer a Claude Code plugin.

```
npm i -g dspec
dspec init          # in any repo — pick your agents
```

- **`dspec init` is new**, and it is the only command a human has to type. It asks which agents to
  set up and writes each one's files in its own syntax: `.claude/commands/ds-*.md` for Claude Code,
  `~/.codex/prompts/ds-*.md` for Codex, `.agents/skills/ds-*/SKILL.md` for Cursor.
- **The commands are typed the same way everywhere: `/ds-bootstrap`, `/ds-spec`, `/ds-plan`,
  `/ds-sync`.** Claude Code gives up its `/ds:` namespace for this — moving between agents should
  not change what you type.
- **`dspec init` adds what is absent and never touches what is there.** Not a file, not a key, not
  a line, and there is no `--force`. The cost is stated rather than hidden: a command file you
  already have will never be replaced by a newer version of itself, so after an upgrade you delete
  the one you want refreshed and run `dspec init` again.
- **`AGENTS.md` is rendered alongside `CLAUDE.md`** when Codex or Cursor is installed. It carries
  one extra paragraph asking the agent to run `dspec sync --brief` when a session opens, because
  neither can run a command on a session event.
- **The three session hooks remain Claude Code only**, and dspec now says so per agent instead of
  implying every agent gets the whole loop.
- **No agent is promised a fence it does not have.** `/ds-spec` cannot write under Claude Code
  because its tool list forbids it; Codex and Cursor honour no tool list, and the prose they
  receive says the restraint is the reader's own. The old wording claimed the mechanism to all
  three, which was true in one and false in two.
- **`ds version` and `/ds:update` are gone.** `dspec --version` prints the number; the health
  report nobody asked for was burying it. Upgrading is `npm i -g dspec@latest`.
- **The plugin is retired** — `.claude-plugin/`, `dist-plugin/` and the plugin build script go with
  it, and with them two of the three JSON files that used to carry the version.
- **Fixed two silent hook failures this move would otherwise have shipped**, both of the same
  shape: the hook's `require` throws, the catch turns it into `exit 0`, and the hook simply stops
  speaking with nothing to say why.
  - The hooks now live in `.claude/hooks/`, where a `require` relative to the hook resolves to
    `.claude/dist/`. Two contract tests fail on the pattern rather than on the symptom.
  - `.ds/config.json` now records dspec's package `root` outright instead of deriving it from the
    CLI path. After `npm i -g dspec` that path is a symlink npm made at `<prefix>/bin/dspec`, whose
    grandparent holds no `dist/` — so the derivation worked in a checkout and failed on every real
    install. Found by installing the packed tarball into a temp prefix, which the suite now
    reproduces without needing npm.

- **An agent's own directory is no longer counted as undescribed source.** `dspec init` commits
  `.claude/hooks/*.js` so a teammate gets them on clone, which made them tracked `.js` files — and
  the very next `dspec sync` reported *"code no feature describes: .claude/hooks 4/4"*. `.claude`,
  `.agents`, `.cursor`, `.codex`, `.gemini`, `.github`, `.vscode` and `.idea` are configuration for
  the tools around a product, never the product.
- Every CLI name in output, docs and templates now reads `dspec`. Released changelog entries keep
  the `ds` they were written with, because they are a record of what shipped.

### Other

- The install commands now sit directly under the demo at the top of the README, so what to type is
  visible without scrolling; the two-step explanation and the `ds@ds` warning stay where they were.
- Contributing guidance moved out of the README into `CONTRIBUTING.md`, which GitHub links from the
  issue and pull-request surfaces. The project's rules are not restated there — the file points at
  `.ds/product.md`, where they are authored.
- Added a code of conduct, issue forms and a pull-request template. The bug form asks for
  `dspec --version` up front, which is where every diagnosis starts.

## [1.0.2] — 2026-09-05

- **A dependency in a context pack is now a contract, not a whole feature.** Under
  *"What it uses"* each one carries its name, files, entry point, lead and **rules**, plus the
  command that fetches the rest — but no longer its behaviour, `uses:` or `tests:`. The depth-1
  closure measured 58% of a pack, rendered at the same fidelity as the feature actually being
  worked on. Across every dependency edge in this repo's own model the closure falls 31%, and a
  whole pack 18–20%.
- Rules are kept deliberately: the pack exists partly to surface the rule a request contradicts,
  and that rule is often a dependency's.
- Nothing became unreachable and no flag was added — `--touch "<Feature>"` already promotes a
  dependency to a full feature, and each contract now prints that command.

## [1.0.1] — 2026-09-05

- **Installs now follow a release channel instead of the default branch.** The declaration written
  by `ds bootstrap` names `ref: v1`, a tag moved onto each release, so landing a commit on `master`
  no longer ships it to everybody. Install with `/plugin marketplace add tuna781/dspec@v1`.
- A `ref` the user chose is never overwritten: pinning an immutable `v1.0.1` survives a re-run of
  `ds bootstrap`.
- `ds version` reports which ref is installed, and reports its absence as the default branch
  rather than assuming the channel.

## [1.0.0] — 2026-09-05

Initial public release.

dspec keeps a product model as markdown in `.ds/` — one file per feature, each declaring the files
it lives in and the features it depends on, each fingerprinted against the checkout.

- **dspec-lang**: four file kinds (`product.md`, `glossary.md`, generated `index.md`,
  `features/*.md`), seven frontmatter keys of which three are required, a lead paragraph and two
  body labels. The path of a feature file carries no meaning; `area:` is the only grouping.
- **Declared, not inferred.** `code:` and `uses:` are written by a person and verified by
  `ds check`: every path must exist, every name must resolve, every `entry:` must be declared in
  one of the feature's own files.
- **Retrieval is a lookup.** `ds spec` resolves a name and never guesses from overlapping words. A
  request naming no feature is told so, and the index is printed to choose from.
- **Reconciliation runs both ways.** `ds sync` reports descriptions whose code moved or changed,
  and source files no feature describes. `--write` only re-measures: it never rewrites a
  description and never deletes a feature.
- **Six lint rules**, chosen by one question — does this failure hide? A `uses:` typo silently
  costs an edge and is an error; an `area:` typo shows in the index and needs no rule.
- **Three hooks**: a session opens knowing what the project owes, an edit surfaces the features
  claiming that file, and leaving with a stale model earns one reminder. All of them only add
  context and none can block a tool call.

Only `ds bootstrap` and `ds sync` write to `.ds/`, and only `ds sync --strict` exits non-zero.
