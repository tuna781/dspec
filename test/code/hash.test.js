'use strict';
// ============================================================
// The fingerprint.
//
// Two properties, and the asymmetry between them is the whole design:
//   - a FALSE POSITIVE (drift reported after a reformat) is noise that teaches people to ignore
//     the report;
//   - a FALSE NEGATIVE (changed code called unchanged) is the silent failure the product exists
//     to prevent.
// So normalisation removes only what provably cannot carry meaning.
// ============================================================
const { test } = require('node:test');
const assert = require('node:assert');
const { normalise, stampFiles, declaresSymbol, isLegacyStamp, isCurrentStamp } = require('../../dist/code/hash.js');
const { makeRepo, writeIn } = require('../support/repo');

const stampOf = (dir, files) => stampFiles(dir, files).stamp;

test('reformatting is not drift', () => {
  const a = 'function f() {\n  const x = 1;\n  return x;\n}';
  const b = 'function f() {\r\n    const x = 1;\r\n\r\n    // a note\r\n    return x;   \r\n}';
  assert.strictEqual(normalise(a), normalise(b));
});

test('flattening a nested block IS drift — structure survives normalisation', () => {
  const nested = 'if x:\n    a()\n    b()';
  const flat = 'if x:\n    a()\nb()';
  assert.notStrictEqual(normalise(nested), normalise(flat));
});

test('spacing inside a line is kept — a string literal is not ours to rewrite', () => {
  assert.notStrictEqual(normalise('const s = "a  b";'), normalise('const s = "a b";'));
});

test('a comment marker inside a string is not a comment', () => {
  assert.match(normalise('const u = "http://x/y";'), /http:\/\/x\/y/);
});

test('the stamp is order-independent', () => {
  const dir = makeRepo({ files: { 'a.ts': 'export const a = 1;\n', 'b.ts': 'export const b = 2;\n' } });
  assert.strictEqual(stampOf(dir, ['a.ts', 'b.ts']), stampOf(dir, ['b.ts', 'a.ts']));
});

test('changing any claimed file changes the stamp', () => {
  const dir = makeRepo({ files: { 'a.ts': 'export const a = 1;\n', 'b.ts': 'export const b = 2;\n' } });
  const before = stampOf(dir, ['a.ts', 'b.ts']);
  writeIn(dir, 'b.ts', 'export const b = 3;\n');
  assert.notStrictEqual(before, stampOf(dir, ['a.ts', 'b.ts']));
});

test('a missing file yields NO stamp — a partial one would assert freshness falsely', () => {
  const dir = makeRepo({ files: { 'a.ts': 'export const a = 1;\n' } });
  const r = stampFiles(dir, ['a.ts', 'gone.ts']);
  assert.strictEqual(r.stamp, null);
  assert.deepStrictEqual(r.missing, ['gone.ts']);
});

test('an older generation of stamp reads as unmeasured, never as drift', () => {
  assert.ok(isLegacyStamp('sha256n:abc'), 'a per-symbol fingerprint from an older generation');
  assert.ok(isLegacyStamp('sha256:abc'));
  assert.ok(!isCurrentStamp('sha256n:abc'));
  assert.ok(isCurrentStamp(stampOf(makeRepo({ files: { 'a.ts': 'export const a = 1;\n' } }), ['a.ts'])));
});

// ─── `entry:` ───────────────────────────────────────────────────────────────

const DECLARATIONS = [
  ['TS export function', 'export function placeOrder(c) {\n}', 'placeOrder'],
  ['TS arrow const', 'export const placeOrder = (c) => {\n};', 'placeOrder'],
  ['TS class', 'export class Order {\n}', 'Order'],
  ['TS interface', 'export interface Order {\n}', 'Order'],
  ['Python def', 'def place_order(c):\n    pass', 'place_order'],
  ['Python class', 'class Order:\n    pass', 'Order'],
  ['Go func', 'func PlaceOrder(c Cart) error {\n}', 'PlaceOrder'],
  ['Rust pub fn', 'pub fn place_order(c: Cart) {\n}', 'place_order'],
  ['Rust pub struct', 'pub struct Order {\n}', 'Order'],
  ['Java typed method', 'public List<Order> place(Cart c) {\n}', 'place'],
  ['Java void method', 'public void cancelOrder(String id) {\n}', 'cancelOrder'],
];

for (const [label, source, symbol] of DECLARATIONS) {
  test(`entry resolves: ${label}`, () => assert.ok(declaresSymbol(source, symbol)));
}

test('a CALL is not a declaration', () => {
  assert.ok(!declaresSymbol('  placeOrder({ id: 1 });', 'placeOrder'));
});

test('a control keyword opening a block is not a declaration', () => {
  assert.ok(!declaresSymbol('    catch (IOException e) {', 'e'));
  assert.ok(!declaresSymbol('    while (ready) {', 'ready'));
});
