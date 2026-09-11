#!/usr/bin/env node
'use strict';
// ============================================================
// Cut a release — the git tag is the version, and nothing else is
//
// The version lives in three JSON files. Kept in step by hand, with a git tag alongside that
// nothing checks, they drift within the hour: a tag is pushed, one more commit lands on
// `master`, and from then on every fresh install gets that later commit while still calling
// itself the tagged version. Two people on "the same version" run different code.
//
// So: **the tag names the version, this script writes it everywhere, and it places the tag on
// the commit that actually shipped.** The ordering is the whole point — a tag
// created BEFORE the release commit points at code that is not what shipped.
//
//   node scripts/release.js            # re-cut the latest existing tag
//   node scripts/release.js v0.2.0     # cut a new one
//
// It stops rather than guesses: a dirty tree, a malformed tag, a tag already on the remote.
// ============================================================

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf-8' }).trim();

/** Ask git a question that may have no answer, without letting it print `fatal:` at the user. */
const gitQuiet = (...args) => {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
};

function die(msg, fix) {
  console.error(`✗ ${msg}`);
  if (fix) console.error(`  ${fix}`);
  process.exit(1);
}

// ── which tag ───────────────────────────────────────────────────────────────
let tag = process.argv[2];
if (!tag) {
  tag = gitQuiet('describe', '--tags', '--abbrev=0', '--match', 'v*');
  if (!tag) die('no `v*` tag in this repository, and none given', 'node scripts/release.js v0.1.0');
  console.log(`· no tag given — re-cutting the latest, ${tag}`);
}
if (!/^v\d+\.\d+\.\d+$/.test(tag)) {
  die(`\`${tag}\` is not a version tag`, 'expected vMAJOR.MINOR.PATCH, e.g. v0.2.0');
}
const version = tag.slice(1);

// ── refuse to release a tree nobody can reproduce ───────────────────────────
if (git('status', '--porcelain')) {
  die('the working tree has uncommitted changes',
      'commit or stash them — a release must name a commit that exists');
}

// ⚠️ A tag already on the remote cannot be moved without rewriting what other people fetched.
// Better to say so than to force-push somebody else's reference point out from under them.
const remoteRef = gitQuiet('ls-remote', '--tags', 'origin', `refs/tags/${tag}`);
const onRemote = Boolean(remoteRef);

// ── write the version everywhere it is read ─────────────────────────────────
// ⚠️ There used to be three JSON files here, kept in step by hand, and they drifted within an hour
// of the first release. Retiring the Claude Code plugin took two of them with it: `package.json` is
// now the only place a version is declared, and the lockfile follows it.
const FILES = [
  ['package.json', (j) => { j.version = version; }],
  // ⚠️ The lockfile carries the version TWICE, and npm rewrites both from `package.json` on the
  // next `npm install` — so a release that skips it leaves a file in git that disagrees with
  // every other version source until some contributor's unrelated install silently corrects it.
  // It was found holding `0.3.3` while everything else said `0.1.0`.
  ['package-lock.json', (j) => {
    j.version = version;
    if (j.packages && j.packages['']) j.packages[''].version = version;
  }],
];

const touched = [];
for (const [rel, set] of FILES) {
  const file = path.join(ROOT, rel);
  const before = fs.readFileSync(file, 'utf-8');
  const json = JSON.parse(before);
  set(json);
  const after = JSON.stringify(json, null, 2) + '\n';
  if (after !== before) {
    fs.writeFileSync(file, after, 'utf-8');
    touched.push(rel);
  }
}
console.log(touched.length ? `✓ version ${version} → ${touched.join(', ')}` : `· already at ${version}`);

// ── build and prove it ──────────────────────────────────────────────────────
const run = (cmd, args) => execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit' });
run('npm', ['test']);

// ── one commit, and the tag ON it ───────────────────────────────────────────
if (git('status', '--porcelain')) {
  run('git', ['add', '-A']);
  run('git', ['commit', '-m', `Release ${tag}`]);
  console.log(`✓ committed ${git('rev-parse', '--short', 'HEAD')}`);
}

const head = git('rev-parse', 'HEAD');
const tagged = gitQuiet('rev-parse', `${tag}^{commit}`);

if (tagged === head) {
  console.log(`✓ ${tag} already points at HEAD`);
} else if (tagged && onRemote) {
  die(`${tag} is already on origin, pointing at ${tagged.slice(0, 7)}, but this release is ${head.slice(0, 7)}`,
      `moving a published tag rewrites what others have fetched. Cut a new version instead.`);
} else {
  run('git', ['tag', '-f', '-a', tag, '-m', `DSpec ${version}`]);
  console.log(`✓ ${tag} → ${head.slice(0, 7)}`);
}

// ── the channel tag ─────────────────────────────────────────────────────────
//
// ⚠️ **`v1` is the one tag that is SUPPOSED to move**, and it is what users actually install from:
// `.claude/settings.json` names `ref: "v1"`, because Claude Code has no "latest tag" resolution —
// a ref is a literal name, so "latest" only exists if a name is moved onto it.
//
// This is the opposite rule from the one above, and deliberately so. `v1.2.0` is a *record* of
// what shipped and moving it rewrites history somebody already fetched; `v1` is a *pointer* to the
// current release, and a release that leaves it behind ships to nobody. Immutable tags stay
// immutable precisely so this one can move.
const channel = `v${version.split('.')[0]}`;
run('git', ['tag', '-f', '-a', channel, '-m', `DSpec ${version} — release channel`]);
console.log(`✓ ${channel} → ${head.slice(0, 7)} (release channel)`);

// ⚠️ Publishing the GitHub Release is a SEPARATE step, and comes after the push. A Release
// cannot be created for a tag the remote does not have — `gh` would otherwise create that tag
// itself, from whatever the default branch points at, and the Release would describe a commit
// nobody released. This script must not push, so it cannot publish either; it names the step
// instead. `publish-release.js` is idempotent, so a forgotten one can be run later.
//
// The channel tag needs `--force` because it moved; the version tag never does.
console.log(`\nPush it, then publish the release:
  git push origin master && git push origin ${tag}
  git push --force origin ${channel}
  node scripts/publish-release.js ${tag}`);
