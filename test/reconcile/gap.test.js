'use strict';
// ============================================================
// code → model.
//
// The half that makes reconciliation a reconciliation. It counts FILES: counting declarations
// and answered with hundreds of private helpers, a number nobody could act on, so nobody read it.
// ============================================================
const { test } = require('node:test');
const assert = require('node:assert');
const { computeCoverage } = require('../../dist/code/coverage.js');
const { model, feature } = require('../fixtures/complete-model.js');
const { makeRepo } = require('../support/repo');

test('a described file is covered; the rest are listed', () => {
  const dir = makeRepo({ files: {
    'src/a.ts': 'export const a = 1;\n',
    'src/b.ts': 'export const b = 2;\n',
  }, git: 'committed' });
  const c = computeCoverage(dir, model({ features: [feature({ code: ['src/a.ts'] })] }));
  assert.strictEqual(c.total, 2);
  assert.strictEqual(c.claimed, 1);
  assert.strictEqual(c.unclaimed, 1);
  assert.deepStrictEqual(c.dirs[0].shown, ['src/b.ts']);
});

test('two features sharing a file is a fact, not a conflict', () => {
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n' }, git: 'committed' });
  const c = computeCoverage(dir, model({ features: [
    feature({ name: 'One', code: ['src/a.ts'] }),
    feature({ name: 'Two', code: ['src/a.ts'] }),
  ] }));
  assert.strictEqual(c.unclaimed, 0);
});

test('a claimed file that is not source is verified but not counted', () => {
  const dir = makeRepo({ files: {
    'src/a.ts': 'export const a = 1;\n',
    'config/settings.json': '{}\n',
  }, git: 'committed' });
  const c = computeCoverage(dir, model({ features: [feature({ code: ['src/a.ts', 'config/settings.json'] })] }));
  assert.strictEqual(c.total, 1, 'a manifest is described by the feature that uses it, not counted as code');
  assert.strictEqual(c.extra, 1);
});

test('counts are exact even when the listing is capped', () => {
  const files = {};
  for (let i = 0; i < 12; i++) files[`src/f${i}.ts`] = `export const f${i} = ${i};\n`;
  const dir = makeRepo({ files, git: 'committed' });
  const c = computeCoverage(dir, model({ features: [] }));
  assert.strictEqual(c.unclaimed, 12, 'the number must never be softened');
  assert.strictEqual(c.dirs[0].shown.length, 8, 'the listing is capped so the report stays readable');
});
