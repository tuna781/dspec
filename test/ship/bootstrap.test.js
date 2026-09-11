'use strict';
// ============================================================
// Scaffolding a first model from an existing repository.
//
// ⚠️ **The empty body is the point, not an omission.** An empty body reports as unwritten, which
// is a worklist. A body pre-filled with a transcription of the code reports as complete — a lie,
// and it buries the very list that would have said what still needs writing. Drafting bodies from
// leading comments once produced 130 "complete" descriptions restating their own signatures.
// ============================================================
const { test } = require('node:test');
const assert = require('node:assert');
const { proposeFeatures, renderProposal } = require('../../dist/cli/commands/scaffold.js');
const { model } = require('../fixtures/complete-model.js');
const { makeRepo, runCli, readIn, existsIn, commit, writeIn } = require('../support/repo');

const empty = () => model({ features: [] });

const repo = () => makeRepo({ files: {
  'src/order/place.ts': 'export function placeOrder() {\n  return 1;\n}\n',
  'src/order/cancel.ts': 'export function cancelOrder() {\n  return 2;\n}\n',
  'src/billing/charge.ts': 'export function charge() {\n  return 3;\n}\n',
}, git: 'committed' });

test('one proposal per directory, carrying every file in it', () => {
  const proposals = proposeFeatures(repo(), empty());
  assert.deepStrictEqual(proposals.map((p) => p.name).sort(), ['Billing', 'Order']);
  assert.deepStrictEqual(
    proposals.find((p) => p.name === 'Order').code,
    ['src/order/cancel.ts', 'src/order/place.ts'],
  );
});

test('an already-claimed file is not proposed again', () => {
  const m = model({ features: [{ ...model().features[0], code: ['src/order/place.ts', 'src/order/cancel.ts'] }] });
  assert.deepStrictEqual(proposeFeatures(repo(), m).map((p) => p.name), ['Billing']);
});

test('a proposal says PROVISIONAL, and its body is empty', () => {
  const [p] = proposeFeatures(repo(), empty());
  const rendered = renderProposal(p);
  assert.match(rendered, /PROVISIONAL/);
  assert.match(rendered, /NOT a feature/);
  assert.strictEqual(rendered.split('---')[2].trim(), '', 'a scaffolded body must say nothing');
});

test('guidance lives in frontmatter comments, never in the body', () => {
  const rendered = renderProposal(proposeFeatures(repo(), empty())[0]);
  const [, frontmatter, body] = rendered.split('---');
  assert.match(frontmatter, /^#/m, 'the guidance belongs above the fence');
  assert.ok(!body.includes('#'), 'a body is rendered into the index and billed on every agent call');
});

test('an unwritten feature is NOT stamped — a stamp would say it is current', () => {
  const dir = repo();
  runCli(dir, 'bootstrap', '--here', '--yes');
  runCli(dir, 'sync', '--write');
  const scaffolded = readIn(dir, '.ds/features/order.md');
  assert.ok(!scaffolded.includes('stamp:'), 'a description that says nothing cannot be current');
  assert.match(scaffolded, /PROVISIONAL/, 'and so the guidance survives for the user to read');
});

test('once a body is written, the next sync stamps it', () => {
  const dir = repo();
  runCli(dir, 'bootstrap', '--here', '--yes');
  writeIn(dir, '.ds/features/order.md', `---
name: Order
area: Sales
code:
  - src/order/cancel.ts
  - src/order/place.ts
---

Placing and cancelling orders.
`);
  runCli(dir, 'sync', '--write');
  assert.match(readIn(dir, '.ds/features/order.md'), /stamp: sha256f:/);
});

test('the index and CLAUDE.md are rendered on the first sync', () => {
  const dir = repo();
  runCli(dir, 'bootstrap', '--here', '--yes');
  runCli(dir, 'sync', '--write');
  assert.ok(existsIn(dir, '.ds/index.md'));
  assert.match(readIn(dir, '.ds/index.md'), /## Src/);
  assert.match(readIn(dir, 'CLAUDE.md'), /\.ds\/index\.md/);
});

// ─── create vs repair ───────────────────────────────────────────────────────

test('bootstrap creates the model and the proposals in one go', () => {
  const dir = repo();
  const r = runCli(dir, 'bootstrap', '--here', '--yes');
  assert.strictEqual(r.status, 0);
  assert.ok(existsIn(dir, '.ds/product.md'));
  assert.ok(existsIn(dir, '.ds/glossary.md'));
  assert.ok(existsIn(dir, '.ds/features/order.md'));
  assert.match(r.stdout, /provisional/i);
  // ⚠️ And nothing else. The agent surface is `dspec init`'s to write; a command that creates a
  // model must not also reach into directories the user's editor owns.
  assert.ok(!existsIn(dir, '.claude'), '`.claude/` belongs to `dspec init`');
});

test('bootstrap REFUSES to scaffold over a model that already has features', () => {
  // Scaffolding over curated work buries it, and "never delete a feature" is a rule the tool does
  // not get to break on the user's behalf. Starting over is an explicit human act.
  const dir = repo();
  runCli(dir, 'bootstrap', '--here', '--yes');
  const before = readIn(dir, '.ds/features/order.md');
  writeIn(dir, '.ds/features/order.md', before.replace('name: Order', 'name: Order lifecycle'));

  const again = runCli(dir, 'bootstrap', '--here', '--yes');
  assert.strictEqual(again.status, 0);
  assert.match(again.stdout, /already described/);
  assert.match(again.stdout, /dspec sync/, 'point at the command that DOES repair');
  assert.match(readIn(dir, '.ds/features/order.md'), /Order lifecycle/, 'curated work is untouched');
});
