---
name: Release
area: Delivery
code:
  - scripts/release.js
  - scripts/publish-release.js
---

Cuts a release: writes the version into the JSON files, runs the suite, commits, and puts the tag
on that commit — then, once it is pushed, creates the GitHub Release for it.

## Rules

- **The git tag is the version, and nothing else is.** Kept in step by hand, the version in
  `package.json` and the tag drift within the hour: a tag is pushed, one more commit lands, and
  every fresh install then gets that later commit while calling itself the tagged version.
- **The tag goes on the commit that shipped.** A tag created before the release commit points at
  code that is not what shipped, so the ordering is the whole point.
- **`release.js` does not push.** A push to `master` is a release to every user the moment it
  lands, so that step is handed to a human deliberately.

## Behaviour

- It stops rather than guesses: a dirty tree, a malformed tag, or a tag already on the remote each
  end the run.
- With no argument it re-cuts the latest existing tag; with one it cuts that tag.
- `publish-release.js` is separate because a GitHub Release cannot be created for a tag the remote
  does not have — so it necessarily runs after the push. Folding it into `release.js` would mean
  either pushing from there or creating a Release that tags the wrong commit.
