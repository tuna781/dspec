'use strict';
// ============================================================
// Freshness, answered by RE-RENDERING AND COMPARING — never by a version number.
//
// A number in a file is a claim the file makes about itself, and a hand-edited file still carries
// the old one. Re-rendering is the only check that cannot be fooled by the thing it is checking.
// ============================================================
const { test } = require('node:test');
const assert = require('node:assert');
const { checkArtifacts } = require('../../dist/compile/artifacts.js');
const { renderAll } = require('../../dist/compile/renderers.js');
const { model, feature } = require('../fixtures/complete-model.js');
const { makeRepo, writeIn } = require('../support/repo');

const P = (m) => ({ projectId: m.product.name, generatedAt: '2026-01-01T00:00:00.000Z' });

function rendered(m = model()) {
  const files = {};
  for (const f of renderAll(m, P(m))) files[f.file] = f.content;
  return { dir: makeRepo({ files }), m };
}

test('a freshly rendered repo is clean', () => {
  const { dir, m } = rendered();
  assert.deepStrictEqual(checkArtifacts(dir, m).stale, []);
});

test('an artifact that was never rendered is reported as missing', () => {
  const m = model();
  assert.deepStrictEqual(
    checkArtifacts(makeRepo({}), m).stale.map((s) => s.reason),
    ['missing', 'missing'],
  );
});

test('a new feature leaves the index behind — and CLAUDE.md untouched', () => {
  const { dir, m } = rendered();
  m.features.push(feature({ name: 'New thing', area: 'Later' }));
  const stale = checkArtifacts(dir, m).stale;
  assert.deepStrictEqual(stale.map((s) => s.path), ['.ds/index.md']);
  // This is the pointer design paying off: the file billed on every agent turn does not change
  // when a feature is added, so it cannot grow with the model.
});

test('a changed product rule leaves CLAUDE.md behind', () => {
  const { dir, m } = rendered();
  m.product.rules = ['- Money is a float now.'];
  assert.ok(checkArtifacts(dir, m).stale.some((s) => s.path === 'CLAUDE.md'));
});

test('a stale artifact is caught even when its stamp still looks right', () => {
  const { dir, m } = rendered();
  const path = '.ds/index.md';
  writeIn(dir, path, '<!-- ds: project=Shop generated=2026-01-01T00:00:00.000Z -->\n# edited by hand\n');
  assert.strictEqual(checkArtifacts(dir, m).stale.find((s) => s.path === path).reason, 'behind');
});

test('an artifact copied in from another repo is named as foreign', () => {
  const { dir, m } = rendered();
  writeIn(dir, 'CLAUDE.md', '<!-- ds: project=OtherRepo generated=x -->\n# no\n');
  assert.strictEqual(checkArtifacts(dir, m).stale.find((s) => s.path === 'CLAUDE.md').reason, 'foreign');
});

test('an unstamped file is reported, never overwritten', () => {
  const { dir, m } = rendered();
  writeIn(dir, 'CLAUDE.md', '# my own file\n');
  const report = checkArtifacts(dir, m);
  assert.deepStrictEqual(report.unstamped, ['CLAUDE.md']);
  assert.ok(!report.stale.some((s) => s.path === 'CLAUDE.md'), 'hand-written is a state, not a failure');
});
