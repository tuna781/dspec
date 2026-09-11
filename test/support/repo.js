'use strict';
// ============================================================
// One way to build a throwaway repo, shared by the whole suite.
//
// The old suite grew five near-identical copies of this, and they drifted: some committed, some
// only staged, some copied the fixture and some did not. A test that fails for a reason its
// author did not intend is worse than no test, because the next person debugs the wrong thing.
//
// ⚠️ **`git add` matters more than it looks.** `trackedFiles` shells out to `git ls-files`, so a
// file that is written but never staged does not exist as far as drift, survey and gap are
// concerned. A test that forgets it gets an empty answer and passes for the wrong reason.
// ============================================================

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const BIN = path.join(ROOT, 'bin', 'ds.js');
const SHOP = path.join(ROOT, 'test', 'fixtures', 'shop');

/** Temp dirs made during this run, removed on exit. */
const MADE = [];
process.on('exit', () => {
  for (const d of MADE) { try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* best effort */ } }
});

/**
 * A throwaway repo.
 *
 *   files   – `{ 'src/a.ts': '…' }`, written relative to the repo root
 *   model   – true ⇒ copy the shop fixture's `.ds/` in
 *   git     – 'none' | 'staged' (default) | 'committed'
 */
function makeRepo({ files = {}, model = false, git = 'staged' } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dspec-'));
  MADE.push(dir);
  if (model) fs.cpSync(path.join(SHOP, '.ds'), path.join(dir, '.ds'), { recursive: true });
  for (const [rel, body] of Object.entries(files)) writeIn(dir, rel, body);
  if (git !== 'none') {
    const g = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
    g('init');
    g('add', '-A');
    if (git === 'committed') g('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'init');
  }
  return dir;
}

function writeIn(dir, rel, body) {
  const p = path.join(dir, ...rel.split('/'));
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, body, 'utf-8');
  return p;
}

const readIn = (dir, rel) => fs.readFileSync(path.join(dir, ...rel.split('/')), 'utf-8');
const existsIn = (dir, rel) => fs.existsSync(path.join(dir, ...rel.split('/')));

/** Stage everything — needed after writing files a git-backed command must see. */
function stage(dir) {
  execFileSync('git', ['add', '-A'], { cwd: dir, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
}

function commit(dir, message = 'wip') {
  stage(dir);
  execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', message],
    { cwd: dir, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
}

/** Run the real CLI as a process — the only way to observe an exit code honestly. */
const runCli = (cwd, ...args) =>
  spawnSync(process.execPath, [BIN, ...args], { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000 });

module.exports = { makeRepo, writeIn, readIn, existsIn, stage, commit, runCli, SHOP, BIN, ROOT };
