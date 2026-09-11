'use strict';
// ============================================================
// model → code.
//
// The ordering in `computeStaleness` is load-bearing and this file locks it: evidence FIRST and
// unconditionally, then location, then freshness. Folding evidence into the code branch silences
// it exactly when the code is gone too — which is when it matters most.
// ============================================================
const { test } = require('node:test');
const assert = require('node:assert');
const { computeStaleness, STALE_LABEL, FIXED_BY_SYNC } = require('../../dist/code/staleness.js');
const { stampFiles } = require('../../dist/code/hash.js');
const { model, feature } = require('../fixtures/complete-model.js');
const { makeRepo, writeIn } = require('../support/repo');

const kinds = (items) => items.map((i) => i.kind).sort();

/** A repo whose files match a model, with the stamp already correct. */
function stamped(files, over = {}) {
  const dir = makeRepo({ files, git: 'committed' });
  const code = Object.keys(files).filter((f) => f.endsWith('.ts'));
  const { stamp } = stampFiles(dir, code);
  // `entry` is dropped unless a case asks for it: these throwaway files declare no symbols, and
  // an unrelated `entry_lost` in every result would hide the thing each test is actually checking.
  return { dir, m: model({ features: [feature({ code, stamp, entry: undefined, ...over })] }) };
}

test('a matching model is silent', () => {
  const { dir, m } = stamped({ 'src/a.ts': 'export const a = 1;\n' });
  assert.deepStrictEqual(computeStaleness(dir, m), []);
});

test('editing the code makes it stale', () => {
  const { dir, m } = stamped({ 'src/a.ts': 'export const a = 1;\n' });
  writeIn(dir, 'src/a.ts', 'export const a = 2;\n');
  assert.deepStrictEqual(kinds(computeStaleness(dir, m)), ['stale']);
});

test('reformatting the code does not', () => {
  const { dir, m } = stamped({ 'src/a.ts': 'export function f() {\n  return 1;\n}\n' });
  writeIn(dir, 'src/a.ts', 'export function f() {\n    // why\n    return 1;\n}\n');
  assert.deepStrictEqual(computeStaleness(dir, m), []);
});

test('no stamp is reported as unmeasured, never as fine', () => {
  const { dir, m } = stamped({ 'src/a.ts': 'export const a = 1;\n' });
  m.features[0].stamp = undefined;
  const [item] = computeStaleness(dir, m);
  assert.strictEqual(item.kind, 'unmeasured');
});

test('a stamp from an older generation is unmeasured, NOT drift — a different ruler', () => {
  const { dir, m } = stamped({ 'src/a.ts': 'export const a = 1;\n' });
  m.features[0].stamp = 'sha256n:deadbeefdeadbeef';
  assert.deepStrictEqual(kinds(computeStaleness(dir, m)), ['unmeasured']);
});

test('evidence is checked even when the code is gone too', () => {
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n' }, git: 'committed' });
  const m = model({ features: [feature({ code: ['src/gone.ts'], tests: ['test/gone.spec.ts'], stamp: 'sha256f:x' })] });
  assert.deepStrictEqual(kinds(computeStaleness(dir, m)), ['code_missing', 'test_missing']);
});

test('a missing file stops the freshness claim rather than guessing', () => {
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n' }, git: 'committed' });
  const m = model({ features: [feature({ code: ['src/a.ts', 'src/gone.ts'], stamp: 'sha256f:x' })] });
  assert.deepStrictEqual(kinds(computeStaleness(dir, m)), ['code_missing'], 'no stale/unmeasured on top');
});

test('a lost entry says where it went', () => {
  const dir = makeRepo({ files: {
    'src/a.ts': 'export const a = 1;\n',
    'src/moved.ts': 'export function placeOrder() {\n}\n',
  }, git: 'committed' });
  const { stamp } = stampFiles(dir, ['src/a.ts']);
  const m = model({ features: [feature({ code: ['src/a.ts'], entry: 'placeOrder', stamp })] });
  const [item] = computeStaleness(dir, m);
  assert.strictEqual(item.kind, 'entry_lost');
  assert.strictEqual(item.foundAt, 'src/moved.ts');
});

test('only re-measurable kinds point at sync', () => {
  assert.deepStrictEqual([...FIXED_BY_SYNC].sort(), ['stale', 'unmeasured']);
  for (const k of Object.keys(STALE_LABEL)) assert.ok(STALE_LABEL[k], `${k} has no label`);
});
