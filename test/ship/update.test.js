'use strict';
// ============================================================
// `dspec update` — against a stand-in `npm`, so the suite never touches the network or the
// machine's global packages.
// ============================================================
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { makeRepo, BIN, ROOT } = require('../support/repo');

const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8')).version;

const skip = process.platform === 'win32' ? 'a shell-script npm stand-in and a Unix global layout' : false;

/**
 * A global install laid out exactly as `npm i -g` makes one, under a directory whose name looks like
 * a UUID — the shape npm redacts in its own output, which is what broke the check this replaced.
 */
function globalInstall() {
  const dir = makeRepo({ files: {} });
  const prefix = path.join(dir, '51fcc12a-b933-49b7-ab29-eb3cfcce2b75', 'prefix');
  const pkg = path.join(prefix, 'lib', 'node_modules', 'dspec');
  fs.mkdirSync(pkg, { recursive: true });
  for (const part of ['bin', 'dist', 'templates', 'package.json']) {
    fs.cpSync(path.join(ROOT, part), path.join(pkg, part), { recursive: true });
  }
  fs.mkdirSync(path.join(prefix, 'bin'));
  fs.symlinkSync(path.join('..', 'lib', 'node_modules', 'dspec', 'bin', 'ds.js'), path.join(prefix, 'bin', 'dspec'));
  return { dir, prefix, pkg, bin: path.join(prefix, 'bin', 'dspec') };
}

/** Run `dspec update` (from `bin`, default: the checkout) with a fake `npm` first on PATH. */
function update({ latest, bin = BIN }, ...args) {
  const dir = makeRepo({ files: {} });
  const fake = path.join(dir, 'fakebin');
  fs.mkdirSync(fake);
  const log = path.join(dir, 'npm.log');
  fs.writeFileSync(path.join(fake, 'npm'), `#!/bin/sh
echo "$@" >> "${log}"
case "$1" in
  view) ${latest === null ? 'exit 1' : `echo "${latest}"`} ;;
  install) exit 0 ;;
esac
`, { mode: 0o755 });
  const r = spawnSync(process.execPath, [bin, 'update', ...args], {
    cwd: dir,
    encoding: 'utf-8',
    env: { ...process.env, PATH: `${fake}${path.delimiter}${process.env.PATH}` },
  });
  return { ...r, calls: fs.existsSync(log) ? fs.readFileSync(log, 'utf-8') : '' };
}

test('the current version is reported as latest, and nothing is installed', { skip }, () => {
  const r = update({ latest: VERSION });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /is the latest version/);
  assert.ok(!/install/.test(r.calls));
});

test('--check names a newer version and installs nothing', { skip }, () => {
  const r = update({ latest: '99.0.0' }, '--check');
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /99\.0\.0 is available/);
  assert.ok(!/install/.test(r.calls));
});

test('a dspec that is not a global install is never rewritten from here', { skip }, () => {
  // The suite runs from a checkout, which is exactly that case.
  const r = update({ latest: '99.0.0' });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /not a global npm install/);
  assert.ok(!/install/.test(r.calls), 'a project-local or checkout dspec belongs to its own package.json');
});

test('an npm that cannot answer is said plainly', { skip }, () => {
  const r = update({ latest: null });
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /could not ask npm/);
});

test('versions compare numerically, not as text', () => {
  const { isNewer } = require('../../dist/cli/commands/update.js');
  assert.ok(isNewer('0.0.10', '0.0.9'));
  assert.ok(isNewer('1.0.0', '0.99.99'));
  assert.ok(!isNewer('0.0.2', '0.0.2'));
  assert.ok(!isNewer('0.0.2-beta.1', '0.0.2'));
});

test('a global install is recognised by its layout — a UUID-like directory above it included', { skip }, () => {
  const { globalPrefixOf } = require('../../dist/cli/commands/update.js');
  const g = globalInstall();
  assert.strictEqual(globalPrefixOf(g.pkg), fs.realpathSync(g.prefix));

  // A project's own node_modules is not one, and neither is a checkout.
  const project = makeRepo({ files: { 'node_modules/dspec/package.json': '{"name":"dspec"}' } });
  fs.mkdirSync(path.join(project, 'node_modules', '.bin'));
  assert.strictEqual(globalPrefixOf(path.join(project, 'node_modules', 'dspec')), null);
  assert.strictEqual(globalPrefixOf(ROOT), null);

  // `lib/node_modules/dspec` without npm's link beside it is not one either.
  fs.rmSync(g.bin);
  assert.strictEqual(globalPrefixOf(g.pkg), null);
});

test('a global install is updated in the prefix it runs from, and the next step is named', { skip }, () => {
  const g = globalInstall();
  const r = update({ latest: '99.0.0', bin: g.bin });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.calls, new RegExp(`install -g --prefix ${fs.realpathSync(g.prefix).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} dspec@latest`));
  assert.match(r.stdout, /→ 99\.0\.0/);
  assert.match(r.stdout, /dspec init/);
  assert.match(r.stdout, /\/ds-update/);
});
