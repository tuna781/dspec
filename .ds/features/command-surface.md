---
name: Command surface
area: Command line
kind: product
code:
  - bin/ds.js
  - src/cli.ts
  - src/args.ts
  - src/pkgRoot.ts
uses: [Agent install]
---

The `dspec` command itself: one verb, its flags, and finding the running package so `templates/`
resolves. Start at `main` in `src/cli.ts`.

## Rules

- **`init` is the whole terminal surface.** The `COMMANDS` table has one entry, and `VERBS` is
  exported from it so any surface that names commands is checked against the table rather than
  against a second list. dspec owns no process, so there is no verb that measures, lints or gates
  anything, and none that reads the map. If a user cannot name a command, it should not exist.
- **No network call exists anywhere in this program.** Upgrading is `npm`'s job, which the user
  already has.
- **Strict flag parsing, always.** `parseFlags` passes `strict: true` to `node:util.parseArgs`
  and keeps only the first line of its error, which is the one that names the bad flag. A mistyped
  flag must be an error.
- **Errors print one line, never a stack.** A Node stack trace only pushes the one useful line off
  the screen.

## Behaviour

- `bin/ds.js` awaits `main` and sets `process.exitCode` rather than calling `exit()`, so stdout has
  time to flush when the output is piped. It is the only file that knows where `dist/` is.
- `--version` and `--help` are flags, not verbs: `main` answers both before it ever looks in
  `COMMANDS`.
- Two non-zero exits, and no others: 2 for a usage error — *"no such command"*, *"no such
  agent"*, a dspec whose `templates/` is missing — and 1 for a failure that reached the top as an
  exception, caught in `main` and again in `bin/ds.js`. Ordinary work always exits 0, including a
  `settings.json` that could not be parsed.
- `packageRoot` walks up from the compiled file, `locate()` doing the walking and `identify()`
  answering *is this directory dspec* by reading `package.json`'s `name`. Both answers are cached
  in `cachedRoot` and `cachedVersion`, so the walk happens once. The name guard is necessary rather
  than decoration: a repo that *uses* dspec has a `package.json` at its root too, and stopping at
  the first one found would return the user's project — from which `templates/` does not resolve,
  and `init` would report an incomplete install of a perfectly good one.
- `packageVersion` returns `'unknown'` rather than a plausible `0.0.0` when nothing declares one: a
  made-up number reads as an answer, and this one is printed where somebody is deciding whether to
  upgrade.

## Decisions

- **`dspec update` was deleted.** Wrapping `npm` bought a second way to type the same thing and the
  only outbound request in the tool.
- **Strict parsing came from a silent failure.** `--stirct` once passed through an `includes`
  check and a CI job was green because of it; `parseFlags` exists so that no surface parses flags
  its own way again.
- **`--version` and `--help` stayed flags rather than becoming verbs.** The number is the question
  people ask, and a health report nobody asked for only makes the answer harder to find.
- **`packageRoot` walks up rather than counting `..`.** Counting would encode each caller's depth
  inside `dist/`, which only breaks after publishing.
- **A failed walk falls back rather than throwing.** `locate()` ends at the filesystem root by
  resolving `..` from `__dirname` and returning a null version. Callers already handle a missing
  `templates/`, and an exception there would kill `init` outright.
