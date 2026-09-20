# Contributing to dspec

Thanks for looking. This file is the whole contract — there is no second place to check.

**What dspec is, in one line:** it writes a map of a codebase into `.ds/` and teaches Claude Code,
Codex and Cursor to read it instead of searching. It is not a workflow, and it does not want to
become one.

## Getting set up

Node **≥ 20** (`.nvmrc` pins it). No runtime dependencies; the only dev dependencies are TypeScript
and `@types/node`.

```bash
npm install && npm run build && npm test
```

`npm test` type-checks first, then runs the whole suite with `node --test`. Every test file is plain
`node:test` and can be run alone: `node --test test/install.test.js`.

## Rules that are easy to get wrong

- **`templates/` is the one source of every instructional text.** An adapter has no templates of
  its own: it reads these two files and prepends its own frontmatter. Never fork the prose per
  agent — the copy is the one that goes stale, and it goes stale for exactly one agent's users.
- **Only Claude Code honours `allowed-tools`.** Prose promising a restriction the agent does not
  enforce is worse than no promise. If a template says something is prevented, check it is
  prevented in all three.
- **dspec writes only what carries its mark.** Anything installed gets `dspec:managed`, and `init`
  deletes only marked files before writing them again. A new install location needs both halves —
  `plan()` to write it and `owned()` to take it back — or an upgrade leaves it behind forever.
- **A memory file is the user's.** Only the block between `<!-- ds:begin -->` and `<!-- ds:end -->`
  may be written. Every other byte of `CLAUDE.md` / `AGENTS.md` is passed through untouched.
- **Test files live one level deep.** `npm test` expands `test/*.test.js`, so a file nested deeper
  would never run and the suite would stay green by not testing it.

## Where things live

`src/cli.ts` is the command surface · `src/init.ts` is `dspec init`, the only verb · `src/agents.ts`
holds the three per-agent adapters, and is the one place anything is agent-specific ·
`src/install.ts` owns the `dspec:managed` mark, the rebuild, and the memory-file block writer ·
`templates/` is the prose every agent receives: `bootstrap.md` is the command body,
`memory.md` is the block written into `CLAUDE.md` / `AGENTS.md`.

The whole program is about a thousand lines. It installs files, and nothing else: it neither reads nor
writes `.ds/`, and it measures nothing about your code. If a change needs it to, that change is
probably a workflow, and workflows are what 0.2.0 removed.

## The project's non-negotiables

A change that breaks one of these will be turned down however good it is otherwise. They are the
same rules the tool holds itself to, and they are the reason it is worth using.

- **Zero runtime dependencies.** A pull request adding one to `dependencies` has to argue for it
  first.
- **Everything is local, and nothing touches the network.** No server, no token, no telemetry, no
  version check. `dspec init` reads `templates/` and writes files, and that is the whole of it.
- **dspec is not a workflow.** It imposes no process, no gate and no way of working. It installs a
  map-building command and the instructions for reading the map.
- **Report, never block.** Nothing exits non-zero except a usage error.
- **dspec owns what carries its mark, and nothing else** — see the rules above.
- **Every agent, one surface.** One command, the same spelling everywhere. A new agent is an
  adapter over a file path and a frontmatter shape, never a second implementation.
- **English only** — code, comments, CLI output, docs and templates.

## Reporting a bug

Open an [issue](https://github.com/tuna781/dspec/issues/new/choose). The bug form asks for the
output of `dspec --version` and **which agent** you were using — every agent puts its files
somewhere different, so half the reports depend on that answer, and asking for it up front saves a
round trip. Questions that are not bugs belong in
[Discussions](https://github.com/tuna781/dspec/discussions).

Security issues go through [SECURITY.md](SECURITY.md), not the issue tracker.

## Sending a pull request

**Users install from npm, not from `master`, so landing a commit is not yet shipping it.** A
release reaches everybody at `npm publish`, after `npm run release <tag>` has been reviewed.

- Open an issue first for anything larger than a fix.
- Add a test.
- Note user-visible changes in `CHANGELOG.md` under `## [Unreleased]`.
- Do not bump the version and do not tag — **the git tag is the version**, cut at release time by
  `npm run release <tag>`, published with `npm publish`, and given a GitHub Release with
  `node scripts/publish-release.js <tag>`.

**House style:** English only, everywhere. Comments explain the decision, not the syntax.

By taking part you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).
