'use strict';
// ============================================================
// Loading `.ds/` — the four file kinds.
//
// What this defends: the path of a feature file carries NO meaning. That is the central promise of
// the language, and it is the one a future refactor is most likely to break by deriving an area
// from a directory again.
// ============================================================
const { test } = require('node:test');
const assert = require('node:assert');
const { loadModel } = require('../../dist/model/load.js');
const { makeRepo, writeIn } = require('../support/repo');

const FEATURE = `---
name: Place order
area: Checkout
code: [src/order/place.ts]
entry: placeOrder
uses: [Apply discount]
tests: [test/place.spec.ts]
---

Turns a cart into an order.

Rules
- One coupon per order.

Behaviour
- Refuses an empty cart.
`;

test('reads every declared key', () => {
  const dir = makeRepo({ files: { '.ds/features/place-order.md': FEATURE } });
  const [f] = loadModel(dir).model.features;
  assert.strictEqual(f.name, 'Place order');
  assert.strictEqual(f.area, 'Checkout');
  assert.deepStrictEqual(f.code, ['src/order/place.ts']);
  assert.strictEqual(f.entry, 'placeOrder');
  assert.deepStrictEqual(f.uses, ['Apply discount']);
  assert.deepStrictEqual(f.tests, ['test/place.spec.ts']);
  assert.strictEqual(f.lead, 'Turns a cart into an order.');
  assert.deepStrictEqual(f.rules, ['- One coupon per order.']);
  assert.deepStrictEqual(f.behaviour, ['- Refuses an empty cart.']);
});

test('a subfolder changes nothing — the path carries no meaning', () => {
  const flat = makeRepo({ files: { '.ds/features/a.md': FEATURE } });
  const nested = makeRepo({ files: { '.ds/features/deep/deeper/a.md': FEATURE } });
  assert.deepStrictEqual(
    loadModel(flat).model.features[0],
    loadModel(nested).model.features[0],
    'a feature must load identically wherever it sits on disk',
  );
});

test('a name is taken from the filename when none is declared', () => {
  const dir = makeRepo({ files: { '.ds/features/drift-detection.md': '---\narea: X\ncode: [a.ts]\n---\n\nBody.\n' } });
  assert.strictEqual(loadModel(dir).model.features[0].name, 'Drift detection');
});

test('a single value is accepted where a list is expected', () => {
  const dir = makeRepo({ files: { '.ds/features/a.md': '---\nname: A\narea: X\ncode: src/a.ts\nuses: B\n---\n\nBody.\n' } });
  const [f] = loadModel(dir).model.features;
  assert.deepStrictEqual(f.code, ['src/a.ts']);
  assert.deepStrictEqual(f.uses, ['B']);
});

test('a wrong type skips that value rather than killing the load', () => {
  const dir = makeRepo({ files: {
    '.ds/features/a.md': '---\nname: A\narea: X\ncode: 42\n---\n\nBody.\n',
    '.ds/features/b.md': FEATURE,
  } });
  const { features } = loadModel(dir).model;
  assert.strictEqual(features.length, 2, 'one malformed file must not lose the others');
  assert.deepStrictEqual(features.find((f) => f.name === 'A').code, []);
});

test('product rules and vision are split at the label', () => {
  const dir = makeRepo({ files: {
    '.ds/product.md': '---\nname: Shop\n---\n\nOnline retail.\n\nRules\n- No floats for money.\n',
    '.ds/features/a.md': FEATURE,
  } });
  const { product } = loadModel(dir).model;
  assert.strictEqual(product.name, 'Shop');
  assert.strictEqual(product.vision, 'Online retail.');
  assert.deepStrictEqual(product.rules, ['- No floats for money.']);
});

test('a missing `.ds/` throws with the command that fixes it', () => {
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;' } });
  assert.throws(() => loadModel(dir), /dspec sync --write/);
});

test('dotfiles and dot-directories are skipped', () => {
  const dir = makeRepo({ files: {
    '.ds/features/a.md': FEATURE,
    '.ds/features/.hidden.md': FEATURE,
    '.ds/features/.drafts/b.md': FEATURE,
  } });
  assert.strictEqual(loadModel(dir).model.features.length, 1);
});

test('an unclosed frontmatter fence throws rather than reading as body', () => {
  const dir = makeRepo({ files: { '.ds/features/a.md': '---\nname: A\ncode: [a.ts]\n\nno close\n' } });
  assert.throws(() => loadModel(dir), /never closes it/);
});
