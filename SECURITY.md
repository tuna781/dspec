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
- **No network calls, and no listening socket.** Nothing is sent anywhere, there is no telemetry,
  and there is no account, token or server. Every command reads and writes local files and exits.
- **It writes to your repo, and only these files.** `dspec bootstrap` seeds `.ds/` — skipping
  anything already there, so it never overwrites a spec you wrote — and appends one line to
  `.gitignore`. `dspec sync --write` re-measures the `stamp` field in your spec frontmatter and
  re-renders the artifacts. Nothing else is created, and no file outside `.ds/` is treated as ours
  to replace. `dspec sync` never rewrites a spec body and never deletes an element: those are
  decisions, not measurements.
- **`dspec init` adds what is absent and never touches what is there** — not a file, not a key,
  not a line, and there is no flag that turns this off. A file that already exists is left
  byte-for-byte alone whoever wrote it. It writes into `.claude/`, `.agents/` and, for Codex only,
  `~/.codex/prompts/` — that last one being the single case where anything is written outside the
  repository, and it is named in the output every time.
- **`.claude/settings.json` is the one file merged rather than created**, because a `hooks` key
  has to be added to a file you own. Only missing keys are added; a `hooks` block you wrote wins.
  If it is not valid JSON, **nothing at all is written to it** and you are told. One stray comma
  must never cost somebody their whole configuration.
- **`dspec init` installs executable JavaScript that Claude Code runs as hooks** — on session
  start, after a file edit, and on stop. They only run the CLI and print what it says; every path
  exits 0, and none of them can block a tool call. They land in your repo at `.claude/hooks/`,
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

⚠️ **An upgrade does not rewrite the command files already in your repo**, because `dspec init`
never overwrites. If a fix is in the prose an agent reads, delete the affected file under
`.claude/`, `.agents/` or `~/.codex/prompts/` and run `dspec init` again.
