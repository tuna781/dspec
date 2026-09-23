---
name: Release
area: Build & ship
kind: repo
checked: 2026-09-23
code:
  - scripts/release.js
  - scripts/publish-release.js
  - CHANGELOG.md
---

Cuts a release: writes the version into the JSON files and the changelog heading, runs the suite,
commits, and puts the tag on that commit — then, once it is pushed, creates the GitHub Release,
taking its notes from that changelog section. `scripts/release.js` reads top to bottom in the order
it acts: which tag, then the checks, then `FILES`, then the commit and the tag.

## Rules

- **The git tag is the version, and nothing else is.** Kept in step by hand, the version in
  `package.json` and the tag drift within the hour: a tag is pushed, one more commit lands, and
  every fresh install then gets that later commit while calling itself the tagged version.
- **The tag goes on the commit that shipped.** A tag created before the release commit points at
  code that is not what shipped, so the ordering is the whole point.
- **`release.js` does not push.** A push to `master` is a release to every user the moment it
  lands, so that step is handed to a human deliberately.
- **Nothing is written until everything has been checked.** Every refusal is a `die()` above the
  first `writeFileSync`.
- **The release notes have one source.** They are the changelog section for that version. Notes
  written by hand are a second account of a change that already has one; they start identical and
  then disagree.

## Behaviour

- It stops rather than guesses, each through `die()` with the fix on the second line: *"the
  working tree has uncommitted changes"*, *"is not a version tag"*, *"is already on origin"*, and
  *"CHANGELOG.md has neither"* when there is nothing to say about this version.
- The `UNRELEASED` heading becomes `## [<version>] — <today>`, dated by `today()` from a local
  `new Date()` rather than UTC, which would stamp an evening release east of Greenwich with
  tomorrow. A section already headed by this version leaves `datedHeading` null and is left alone,
  so re-cutting a shipped tag keeps the day it actually shipped.
- With no argument it re-cuts the latest existing tag; with one it cuts that tag. Re-cutting is a
  no-op when nothing has changed, down to leaving the tree clean.
- `publish-release.js` refuses with *"is not on origin"* when the tag is not pushed, because `gh
  release create` would otherwise create the tag itself from whatever the default branch points at.
  It slices the notes out of `CHANGELOG.md` between that version's heading and the next `## [`.
- It is idempotent: a tag that already has a Release is left alone, which is also how the ones that
  were missed get backfilled.
- `FILES` is the list of what carries the version: `package.json`, and `package-lock.json`, which
  carries it twice — once at the root and once under `packages['']`. A file already correct is not
  rewritten, so a re-cut leaves the tree clean.
- `CHANGELOG.md` states what a version number covers — the command surface, the `.ds/` file format
  and the exit-code contract — and that while dspec is 0.x a break in any of them is a minor bump.
- `release.js` neither pushes nor publishes, and its closing lines hand the reader the exact four
  commands in order: push master, push the tag, `npm publish`, then `publish-release.js`.
- `release.js`'s header comment says the version lives in three JSON files; `FILES` lists two.
