# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). The command surface, the
`.ds/` file format and the exit-code contract are what the major version covers: a breaking change
to any of them takes a major bump.

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
