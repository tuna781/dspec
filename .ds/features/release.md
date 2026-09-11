---
name: Release
area: Delivery
code: [scripts/release.js, scripts/publish-release.js]
stamp: sha256f:6fa6cf540b952dd6
---

Cuts a release: writes the version into `package.json`, runs the suite, commits, and puts the tag
on that commit. **The git tag is the version** — it used to live in three JSON files kept in step by
hand, and it drifted within an hour of the first release. Retiring the Claude Code plugin took two
of those three files with it, so there is now one number in one place.

Rules
- **The tag goes on the release commit, never before it.** A tag created first points at code that
  is not what shipped.
- **Stop rather than guess** on a dirty tree, a malformed tag, or a tag already on the remote
  pointing elsewhere.
- **A git tag and a published release are different objects.** Creating the tag does not announce
  anything, so a release that skips publication is shipping while the releases page still advertises
  an older version.
- **The channel tag is the one tag that must move, and the version tags are the reason it can.**
  `vMAJOR.MINOR.PATCH` is a record of what shipped, and moving it rewrites what somebody already
  fetched; `vMAJOR` is a pointer to the current release, and a release that leaves it behind ships
  to nobody. The opposite rules are deliberate.
- **Release notes come from the changelog**, never from anything hand-written at publish time: a
  second account of one change starts identical and then drifts.
- **Publication is a separate step**, because a release cannot be created for a tag the remote does
  not have — the tool would otherwise create that tag itself, from wherever the default branch
  points, and describe a commit nobody released. It is idempotent, so a forgotten publication can be
  done later.

Behaviour
- Writing the version, running the suite, committing and tagging happen in
  that order, and the ordering is the point.
- The release moves `vMAJOR` onto the release commit, and that move is what ships: users declare
  `ref: v1`, so landing a commit on `master` reaches nobody until the channel tag follows it.
- The channel tag needs a force-push and the version tag never does, so the two are named as
  separate commands rather than left to whoever is reading to work out.
- The releases page is for people; `npm i -g dspec` is what an install actually reads.
