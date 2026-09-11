#!/usr/bin/env node
'use strict';
// ============================================================
// Publish a GitHub Release for a tag that is already pushed
//
// A git tag and a GitHub Release are different objects, and `release.js` only ever created the
// tag. The Releases page therefore sat at 0.1.0 while v0.2.0, v0.3.0 and v0.3.1 were all tagged
// and shipping — the same "one fact, several places, kept in step by hand" drift that
// `release.js` exists to prevent, reappearing one level up.
//
// ⚠️ **Separate from `release.js` on purpose.** That script must not push: it builds, commits and
// tags, then hands the push to a human, because a push to `master` is a release to every user
// the moment it lands. A GitHub Release cannot be created for a tag the remote does not have —
// so this step necessarily comes AFTER the push, and pretending otherwise would mean either
// pushing from `release.js` or creating a Release that silently tags the wrong commit.
//
//   node scripts/publish-release.js v0.3.1
//
// Idempotent: a tag that already has a Release is left alone, so re-running is safe and this is
// also what backfills the ones that were missed.
// ============================================================

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');

function die(msg, fix) {
  console.error(`✗ ${msg}`);
  if (fix) console.error(`  ${fix}`);
  process.exit(1);
}

const run = (cmd, args) => execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf-8' }).trim();
const quiet = (cmd, args) => {
  try {
    return execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
};

// ── which tag ───────────────────────────────────────────────────────────────
const tag = process.argv[2];
if (!tag) die('no tag given', 'node scripts/publish-release.js v0.3.1');
if (!/^v\d+\.\d+\.\d+$/.test(tag)) die(`\`${tag}\` is not a version tag`, 'expected vMAJOR.MINOR.PATCH');
const version = tag.slice(1);

if (quiet('gh', ['--version']) === null) {
  die('the GitHub CLI (`gh`) is not available', 'install it, or create the release by hand at /releases/new');
}

// ⚠️ The tag must be ON THE REMOTE. `gh release create` will otherwise create it there itself,
// from whatever the default branch happens to point at — which is how a Release ends up
// describing a commit nobody released.
if (!quiet('git', ['ls-remote', '--exit-code', '--tags', 'origin', `refs/tags/${tag}`])) {
  die(`${tag} is not on origin`, `push it first:  git push origin ${tag}`);
}

if (quiet('gh', ['release', 'view', tag]) !== null) {
  console.log(`· ${tag} already has a release — left alone`);
  process.exit(0);
}

// ── notes, from the changelog and nowhere else ──────────────────────────────
//
// Hand-written release notes are a second description of a change that already has one. They
// start identical and drift, and then two accounts of the same version disagree.
const CHANGELOG = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf-8');
// ⚠️ Sliced, not matched with a lookahead. The first version of this ended the section with
// `(?=^## \[|\Z)` — and `\Z` is not JavaScript. It is a Perl/Python anchor; in a JS regex it
// matches a literal `Z`, so the alternation only ever succeeded because ANOTHER release section
// followed. The first changelog with a single entry failed to match at all, and the script
// reported "no such section" about a section that was plainly there.
const head = new RegExp(`^## \\[${version.replace(/\./g, '\\.')}\\][^\\n]*$`, 'm').exec(CHANGELOG);
if (!head) {
  die(`CHANGELOG.md has no \`## [${version}]\` section`,
      'add one, or the release would ship with no account of what changed');
}
const rest = CHANGELOG.slice(head.index + head[0].length);
const next = /^## \[/m.exec(rest);
const notes = (next ? rest.slice(0, next.index) : rest).trim();
if (!notes) die(`the \`## [${version}]\` section is empty`);

run('gh', ['release', 'create', tag, '--title', `DSpec ${version}`, '--notes', notes]);
console.log(`✓ released ${tag} — ${run('gh', ['release', 'view', tag, '--json', 'url', '--jq', '.url'])}`);
