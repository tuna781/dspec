# Contributing to dspec

Thanks for looking. This file is the whole contract — there is no second place to check.

## Getting set up

Node **≥ 20** (`.nvmrc` pins it). No runtime dependencies; the only dev dependencies are TypeScript
and `@types/node`.

```bash
npm install && npm run build && npm test
```

`npm test` type-checks first, then runs the whole suite with `node --test`. Every test file is plain
`node:test` and can be run alone: `node --test test/model/lint.test.js`.

## Four rules that are easy to get wrong

- **`templates/` is the one source of every instructional text.** An adapter has no templates of
  its own: it reads these files and rewrites the frontmatter. Never fork the prose per agent — the
  copy is the one that goes stale, and it goes stale for exactly one agent's users.
- **A hook must not `require` dspec relative to itself.** The hooks are COPIED into the user's
  `.claude/hooks/`, so `../dist/` resolves to `.claude/dist/` and throws — which the catch turns
  into `exit 0`. The hook stops working and says nothing. Go through `dspecModule()`.
- **The vocabulary lives in exactly one place.** `src/model/language.ts` declares the keys, the
  labels and the glosses; every surface that teaches them is generated from it. Do not hand-write a
  copy — `test/model/language.test.js` will catch you, which is the point.
- **Test files live exactly one level deep.** `npm test` expands `test/*/*.test.js`, so a file
  nested deeper would never run and the suite would stay green by not testing it.

## Where things live

`src/model/` loads `.ds/` and owns the language · `src/code/` measures the checkout (fingerprint,
staleness, coverage) · `src/compile/` lints and renders · `src/cli/` is the command surface ·
`src/install/` holds the per-agent adapters and the add-only writer · `templates/` is the prose
every agent receives, carrying `__DS_*__` placeholders that each adapter resolves.

## The project's non-negotiables

A change that breaks one of these will be turned down however good it is otherwise. They are the
same rules the tool holds itself to, and they are the reason it is worth using.

**They are authored in [`.ds/product.md`](.ds/product.md) and rendered into `CLAUDE.md` by
`dspec sync` — read them there, not here.** Restating them in a third place is the drift this
project exists to stop, so this file names the source instead of copying it. In short: zero runtime
dependencies, everything local, measure rather than trust, report rather than block, derive rather
than store, say what you do not know, English only, every agent one surface, and add what is absent
but never touch what is there — with the reasoning in the file itself.

## Reporting a bug

Open an [issue](https://github.com/tuna781/dspec/issues/new/choose). The bug form asks for the
output of `dspec --version` and **which agent** you were using — only Claude Code gets the session
hooks, so half the reports depend on that answer, and asking for it up front saves a round trip. Questions that are not bugs belong in
[Discussions](https://github.com/tuna781/dspec/discussions).

Security issues go through [SECURITY.md](SECURITY.md), not the issue tracker.

## Sending a pull request

**Users install from the `v1` tag, not from `master`, so landing a commit is not yet shipping it.**
`npm run release` moves `v1` onto the new release, and that is the moment it reaches everybody.

- Open an issue first for anything larger than a fix.
- Add a test.
- Note user-visible changes in `CHANGELOG.md` under `## [Unreleased]`.
- Do not bump the version and do not tag — **the git tag is the version**, cut at release time by
  `npm run release <tag>` and published with `node scripts/publish-release.js <tag>`.

**House style:** English only, everywhere. Comments explain the decision, not the syntax.

By taking part you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).
