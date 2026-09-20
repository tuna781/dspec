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
- **No listening socket, no telemetry, and no network call at all.** Nothing is sent anywhere,
  there is no account, token or server, and no command — including `init` — opens a connection.
  Upgrading goes through your own `npm`, which you run yourself.
- **The CLI installs files; the agent writes the map.** `dspec init` copies two pieces of prose
  into your agents' command directories and `CLAUDE.md` / `AGENTS.md`. Everything under `.ds/` is
  written by your coding agent, through `/ds-bootstrap`, and is committed with your code like any
  other change you can review in a diff.
- **`dspec init` owns what carries the `dspec:managed` mark, and nothing else.** Every run deletes
  every command it installed and writes it again; a file without the mark — even one named
  `ds-something` — is never written or removed. In `CLAUDE.md` and `AGENTS.md` only the block
  between `<!-- ds:begin -->` and `<!-- ds:end -->` is dspec's. Installs from older versions are removed by
  their old `dspec-` prefix or, for 0.0.1, only where the file is recognisably dspec's. It writes into `.claude/`, `.agents/` and, for Codex
  only, `~/.codex/prompts/` — the single case where anything is written outside the repository, and
  it is named in the output every time.
- **It installs no executable code, and no hooks.** Every file dspec writes is markdown an agent
  reads as instructions. Versions before 0.2.0 installed JavaScript hooks that Claude Code ran on
  session events; those are gone, and `dspec init` deletes the ones an older version left.
- **In `.claude/settings.json`, dspec only ever REMOVES its own hook entries** — the ones an older
  version added, matched by the exact command that version wrote. It never adds anything there,
  and a file holding none of its entries is not rewritten at all. If it is not valid JSON,
  **nothing is written to it** and you are told: one stray comma must never cost somebody their
  whole configuration.
- **It runs no subprocess.** Not `git`, not `npm`, not your build. It reads `templates/` from its
  own package and writes files.
- **It never reads your source code.** Only an agent running `/ds-bootstrap` does that, under your
  agent's own permissions, and what it writes to `.ds/` is markdown you can read in a diff.

## Supported versions

dspec is published as the npm package [`dspec`](https://www.npmjs.com/package/dspec), built from
[`tuna781/dspec`](https://github.com/tuna781/dspec). It is distributed nowhere else — the Claude
Code plugin that preceded it is retired, and anything else claiming to be dspec is not ours.

Fixes land on the latest released version only. Take them with `npm i -g dspec@latest`; the version
you are running is shown by `dspec --version`.

Take a fix with `npm i -g dspec@latest`, then `dspec init` in each repository: `init` rebuilds
every file dspec installed, so a fix in the prose an agent reads reaches you without deleting
anything by hand.
