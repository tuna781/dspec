'use strict';
// ============================================================
// "What does this project still owe?" — derived, never stored.
//
// ⚠️ The rule this defends: **no file may be added to answer this question.** A `todo.md` starts
// synchronised, drifts, and then people trust it instead of the model.
// ============================================================
const { test } = require('node:test');
const assert = require('node:assert');
const { buildWorkList } = require('../../dist/compile/worklist.js');
const { stampFiles } = require('../../dist/code/hash.js');
const { renderAll } = require('../../dist/compile/renderers.js');
const { model, feature } = require('../fixtures/complete-model.js');
const { makeRepo, writeIn, commit } = require('../support/repo');

/** A repo that agrees with its model in every direction. */
function agreeing() {
  const m = model({ features: [feature({ code: ['src/a.ts'], entry: undefined, uses: [] })] });
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n' }, git: 'committed' });
  // Stamp FIRST, render second. The stamp is part of the model, so rendering before it would
  // produce artifacts that are stale the moment they are written — the same ordering `dspec sync`
  // has to get right.
  m.features[0].stamp = stampFiles(dir, ['src/a.ts']).stamp;
  for (const f of renderAll(m, { projectId: m.product.name, generatedAt: '' })) writeIn(dir, f.file, f.content);
  commit(dir);
  return { dir, m };
}

const kinds = (items) => [...new Set(items.map((i) => i.kind))].sort();

test('a repo that agrees owes nothing', () => {
  const { dir, m } = agreeing();
  assert.deepStrictEqual(buildWorkList(dir, m), []);
});

test('editing the code owes a re-stamp, and says which command', () => {
  const { dir, m } = agreeing();
  writeIn(dir, 'src/a.ts', 'export const a = 99;\n');
  const [item] = buildWorkList(dir, m).filter((i) => i.kind === 'stale');
  assert.strictEqual(item.next, 'dspec sync --write');
});

test('an uncommitted model edit is reported with NO next step', () => {
  const { dir, m } = agreeing();
  writeIn(dir, '.ds/features/new.md', '---\nname: New\narea: X\ncode: [src/a.ts]\n---\n\nBody.\n');
  const [item] = buildWorkList(dir, m).filter((i) => i.kind === 'handover');
  assert.ok(item, 'an edited model is worth mentioning');
  assert.strictEqual(item.next, undefined, 'under a code-first loop this is normally work already done');
});

test('a model that has never been committed is not a pending change', () => {
  const m = model({ features: [feature({ code: ['src/a.ts'], entry: undefined, uses: [] })] });
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n', '.ds/features/a.md': '---\nname: A\n---\n' }, git: 'none' });
  assert.ok(!buildWorkList(dir, m).some((i) => i.kind === 'handover'));
});

test('undescribed code is owed, but a feature with no body is owed too', () => {
  const { dir, m } = agreeing();
  writeIn(dir, 'src/b.ts', 'export const b = 2;\n');
  commit(dir);
  m.features[0].lead = '';
  assert.deepStrictEqual(kinds(buildWorkList(dir, m)).filter((k) => k === 'coverage' || k === 'quality').sort(), ['coverage', 'quality']);
});

test('skipping the checkout walk keeps the answer honest about what it skipped', () => {
  const { dir, m } = agreeing();
  writeIn(dir, 'src/a.ts', 'export const a = 99;\n');
  assert.ok(!buildWorkList(dir, m, { skipCode: true }).some((i) => i.kind === 'stale'));
});
