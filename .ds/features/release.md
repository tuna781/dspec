---
name: Release
area: Build & ship
kind: repo
code:
  - scripts/release.js
  - scripts/publish-release.js
  - CHANGELOG.md
---

Cuts a release: writes the version into the JSON files and the changelog heading, runs the suite,
commits, and puts the tag on that commit — then, once it is pushed, creates the GitHub Release,
taking its notes from that changelog section.

## Rules

- **The git tag is the version, and nothing else is.** Kept in step by hand, the version in
  `package.json` and the tag drift within the hour: a tag is pushed, one more commit lands, and
  every fresh install then gets that later commit while calling itself the tagged version.
- **The tag goes on the commit that shipped.** A tag created before the release commit points at
  code that is not what shipped, so the ordering is the whole point.
- **`release.js` does not push.** A push to `master` is a release to every user the moment it
  lands, so that step is handed to a human deliberately.
- **Nothing is written until everything has been checked.**
- **The release notes have one source.** They are the changelog section for that version. Notes
  written by hand are a second account of a change that already has one; they start identical and
  then disagree.

## Behaviour

- It stops rather than guesses: a dirty tree, a malformed tag, a tag already on the remote, or a
  changelog with nothing to say about this version each end the run.
- `## [Unreleased]` becomes `## [<version>] — <today>`, dated in the timezone of whoever is cutting
  the release rather than UTC, which would stamp an evening release east of Greenwich with
  tomorrow. A section already headed by this version is left alone, so re-cutting a shipped tag
  keeps the day it actually shipped.
- With no argument it re-cuts the latest existing tag; with one it cuts that tag. Re-cutting is a
  no-op when nothing has changed, down to leaving the tree clean.
- `publish-release.js` refuses when the tag is not on `origin`, because `gh release create` would
  otherwise create the tag itself from whatever the default branch points at.
- It is idempotent: a tag that already has a Release is left alone, which is also how the ones that
  were missed get backfilled.
- The version is written to `package.json` and to `package-lock.json`, which carries it twice.
- `CHANGELOG.md` states what a version number covers — the command surface, the `.ds/` file format
  and the exit-code contract — and that while dspec is 0.x a break in any of them is a minor bump.
- `release.js` neither pushes nor publishes, and its closing lines hand the reader the exact four
  commands in order: push master, push the tag, `npm publish`, then `publish-release.js`.

## Decisions

- **Checking everything before writing anything came from a bad failure mode.** A failure partway
  through used to leave `package.json` bumped and the tree dirty, so the next run refused with
  "uncommitted changes" — complaining about a mess the previous run had made.
- **`publish-release.js` is a separate script on purpose.** A GitHub Release cannot be created for
  a tag the remote does not have, so it necessarily runs after the push. Folding it into
  `release.js` would mean either pushing from there or creating a Release that tags the wrong
  commit.
- **The lockfile is written too.** Skipping it leaves a committed file disagreeing with every other
  version source until some contributor's unrelated `npm install` silently corrects it — it was
  once found holding `0.3.3` while everything else said `0.1.0`. There used to be three JSON files
  here; retiring the Claude Code plugin took two of them with it.
- **A break while 0.x is a minor bump, not a major one.** Written down because 0.2.0 removed four
  commands, and calling that major would have meant 1.0.0 for a tool still working out its shape.
