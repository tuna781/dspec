# Security Policy

## Reporting a vulnerability

Please report security issues privately, **not** as a public issue: open a
[GitHub security advisory](https://github.com/tuna781/dspec/security/advisories/new), or email
<tuandv.job@gmail.com>.

Please include what you were running, the steps to reproduce, and what an attacker gets out of
it. Expect a first reply within a week.

## What dspec does and does not do

Worth knowing before you go looking, because it narrows the surface a lot:

- **No runtime dependencies.** `package.json` has an empty dependency set; the only dev
  dependencies are TypeScript and `@types/node`. There is no supply chain to speak of.
- **No listening socket, no telemetry, and one network call you start yourself.** Nothing is sent
  anywhere, and there is no account, token or server. `dspec update` asks npm for the latest version
  and installs it, through your own `npm` and its configuration; every other command reads and
  writes local files and exits.
- **The CLI writes the product model mechanically; the agent writes the prose.** `dspec sync --write`
  creates the model when there is none and records fingerprints and generated files after; `dspec
  accept` records that a description was read against its code. The descriptions themselves are
  written by your coding agent, through the `/ds` and `/ds-bootstrap` commands, and are committed
  with your code like any other change you can review in a diff.
- **`dspec init` owns what carries the `dspec:managed` mark, and nothing else.** Every run deletes
  every command and hook it installed and writes them again; a file without the mark — even one
  named `ds-something` — is never written or removed. Installs from older versions are removed by
  their old `dspec-` prefix or, for 0.0.1, only where the file is recognisably dspec's. It writes into `.claude/`, `.agents/` and, for Codex
  only, `~/.codex/prompts/` — the single case where anything is written outside the repository, and
  it is named in the output every time.
- **In `.claude/settings.json`, only dspec's own hook entries are replaced**, matched by the exact
  command dspec writes. Your own hooks and every other key are kept.
  If it is not valid JSON, **nothing at all is written to it** and you are told. One stray comma
  must never cost somebody their whole configuration.
- **`dspec init` installs executable JavaScript that Claude Code runs as hooks** — on session
  start, after a file edit, and on stop. They only run the CLI and print what it says; every path
  exits 0, and none of them can block a tool call. They land in your repo at `.claude/hooks/dspec/`,
  where you can read them before committing them — they are short enough to.
- **The slash commands are permitted as `Bash(dspec …)`.** Approving them approves running the
  `dspec` binary on your PATH; the commands name the exact subcommand they run.
- **It shells out to `git`** to list tracked files, to read a model at another revision, and to
  find the repo root. It reads; it never commits, pushes or rewrites history.
- **It reads your source files** to fingerprint the symbols your specs point at. Those
  fingerprints are hashes, stored in your own repo.

## Supported versions

dspec is published as the npm package [`dspec`](https://www.npmjs.com/package/dspec), built from
[`tuna781/dspec`](https://github.com/tuna781/dspec). It is distributed nowhere else — the Claude
Code plugin that preceded it is retired, and anything else claiming to be dspec is not ours.

Fixes land on the latest released version only. Take them with `npm i -g dspec@latest`; the version
you are running is shown by `dspec --version`.

Take a fix with `dspec update`, then `dspec init` in each repository (or `/ds-update` inside
your agent): `init` rebuilds every command and hook dspec installed, so a fix in the prose an
agent reads reaches you without deleting anything by hand.
