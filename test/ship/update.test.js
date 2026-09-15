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

/** Run `dspec update` with a fake `npm` first on PATH. `latest` is what it reports; `log` records calls. */
function update(latest, ...args) {
  return updateWith({ latest, globalRoot: null }, ...args);
}

function updateWith({ latest, globalRoot }, ...args) {
  const dir = makeRepo({ files: {} });
  const bin = path.join(dir, 'fakebin');
  fs.mkdirSync(bin);
  const log = path.join(dir, 'npm.log');
  fs.writeFileSync(path.join(bin, 'npm'), `#!/bin/sh
echo "$@" >> "${log}"
case "$1" in
  view) ${latest === null ? 'exit 1' : `echo "${latest}"`} ;;
  root) echo "${globalRoot ?? path.join(dir, 'global')}" ;;
  install) exit 0 ;;
esac
`, { mode: 0o755 });
  const r = spawnSync(process.execPath, [BIN, 'update', ...args], {
    cwd: dir,
    encoding: 'utf-8',
    env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` },
  });
  return { ...r, calls: fs.existsSync(log) ? fs.readFileSync(log, 'utf-8') : '' };
}

const skip = process.platform === 'win32' ? 'a shell-script npm stand-in' : false;

test('the current version is reported as latest, and nothing is installed', { skip }, () => {
  const r = update(VERSION);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /is the latest version/);
  assert.ok(!/install/.test(r.calls));
});

test('--check names a newer version and installs nothing', { skip }, () => {
  const r = update('99.0.0', '--check');
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /99\.0\.0 is available/);
  assert.ok(!/install/.test(r.calls));
});

test('a dspec that is not a global install is never rewritten from here', { skip }, () => {
  // The suite runs from a checkout, which is exactly that case.
  const r = update('99.0.0');
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /not a global npm install/);
  assert.ok(!/install -g/.test(r.calls), 'a project-local or checkout dspec belongs to its own package.json');
});

test('an npm that cannot answer is said plainly', { skip }, () => {
  const r = update(null);
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

test('a global install is updated through npm, and the next step is named', { skip }, () => {
  // Pretend the checkout the suite runs from IS the global package directory.
  const r = updateWith({ latest: '99.0.0', globalRoot: path.dirname(ROOT) });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.calls, /install -g dspec@latest/);
  assert.match(r.stdout, /→ 99\.0\.0/);
  assert.match(r.stdout, /dspec init/);
  assert.match(r.stdout, /\/dspec-update/);
});
