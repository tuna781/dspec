'use strict';
// ============================================================
// One way to build a throwaway repo, shared by the whole suite.
//
// The old suite grew five near-identical copies of this, and they drifted. A test that fails for a
// reason its author did not intend is worse than no test, because the next person debugs the
// wrong thing.
//
// ⚠️ **`CODEX_HOME` is redirected into the temp directory.** The Codex adapter writes to the
// user's home by design, so a suite that did not redirect it would install into — and delete from
// — the real `~/.codex/prompts` of whoever ran `npm test`.
// ============================================================

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const BIN = path.join(ROOT, 'bin', 'ds.js');

/** Temp dirs made during this run, removed on exit. */
const MADE = [];
process.on('exit', () => {
  for (const d of MADE) { try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* best effort */ } }
});

/**
 * A throwaway repo.
 *
 *   files – `{ 'src/a.ts': '…' }`, written relative to the repo root
 *   git   – 'none' | 'staged' (default) | 'committed'
 */
function makeRepo({ files = {}, git = 'staged' } = {}) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'dspec-')));
  MADE.push(dir);
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

/** Where this repo's Codex prompts go. See the header: never the real home directory. */
const codexHome = (dir) => path.join(dir, 'codex-home');
const codexPrompt = (dir, name) => path.join(codexHome(dir), 'prompts', name);

/**
 * Run the real CLI as a process — the only way to observe an exit code honestly.
 *
 * `CODEX_HOME` is forced per repo so two tests can never install over each other, and `HOME` with
 * it so a bug in that redirection fails loudly instead of reaching the real one.
 */
const runCli = (cwd, ...args) =>
  spawnSync(process.execPath, [BIN, ...args], {
    cwd,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 60_000,
    env: { ...process.env, CODEX_HOME: codexHome(cwd), HOME: path.join(cwd, 'fake-home') },
  });

module.exports = { makeRepo, writeIn, readIn, existsIn, runCli, codexHome, codexPrompt, BIN, ROOT };
