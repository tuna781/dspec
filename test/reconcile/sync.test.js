'use strict';
// ============================================================
// `dspec sync` end to end, as a real process.
//
// ⚠️ **The invariant with teeth: `--write` RE-MEASURES, it does not rewrite prose.** Everything a
// person wrote must come back byte for byte. A sync that "tidies" a body is a sync that silently
// decides the code was right and the description was wrong.
//
// ⚠️ **The same invariant covers creation.** A repo with no `.ds/` yet is not a special case with
// its own command — `--write` builds the base files and proposes features the first time it finds
// nothing there, then repairs from then on. Whichever it did, the report at the end is read the
// same way.
// ============================================================
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { proposeFeatures, renderProposal } = require('../../dist/cli/commands/scaffold.js');
const { model } = require('../fixtures/complete-model.js');
const { makeRepo, writeIn, readIn, existsIn, runCli, commit } = require('../support/repo');

const empty = () => model({ features: [] });

const FEATURE = `---
name: Adder
area: Maths
code:
  - src/add.ts
entry: add
---

Adds two numbers, and refuses to pretend about overflow.

Rules
- Never returns a float.
`;

function repo() {
  return makeRepo({ files: {
    'src/add.ts': 'export function add(a: number, b: number) {\n  return a + b;\n}\n',
    '.ds/product.md': '---\nname: Calc\n---\n\nA calculator.\n',
    '.ds/features/adder.md': FEATURE,
  }, git: 'committed' });
}

test('--write stamps, renders, and then reports a clean repo', () => {
  const dir = repo();
  assert.strictEqual(runCli(dir, 'sync', '--write').status, 0);
  assert.match(readIn(dir, '.ds/features/adder.md'), /stamp: sha256f:/);
  assert.ok(existsIn(dir, '.ds/index.md'));
  assert.ok(existsIn(dir, 'CLAUDE.md'));
  commit(dir);
  assert.match(runCli(dir, 'sync').stdout, /the model and the code agree/);
});

test('the body survives a stamp byte for byte', () => {
  const dir = repo();
  runCli(dir, 'sync', '--write');
  const after = readIn(dir, '.ds/features/adder.md');
  assert.match(after, /Adds two numbers, and refuses to pretend about overflow\./);
  assert.match(after, /- Never returns a float\./);
});

test('a dry run writes nothing', () => {
  const dir = repo();
  const before = readIn(dir, '.ds/features/adder.md');
  const r = runCli(dir, 'sync');
  assert.strictEqual(readIn(dir, '.ds/features/adder.md'), before);
  assert.ok(!existsIn(dir, '.ds/index.md'));
  assert.match(r.stdout, /dry run/);
});

test('sync always exits 0, even with everything wrong', () => {
  const dir = makeRepo({ files: { '.ds/features/a.md': '---\nname: A\narea: X\ncode: [src/gone.ts]\n---\n\nBody.\n' }, git: 'committed' });
  assert.strictEqual(runCli(dir, 'sync', '--write').status, 0, 'only `check` may redden a pipeline');
});

test('sync NEVER invents a feature once one exists — it lists undescribed code instead', () => {
  // Which files deserve a feature is a judgement. Proposing is a first-run act only — once a
  // person has named even one feature, a repair that answered it anyway would fill a curated
  // model with directories.
  const dir = repo();
  writeIn(dir, 'src/unclaimed/other.ts', 'export const other = 1;\n');
  commit(dir);
  runCli(dir, 'sync', '--write');
  assert.ok(!existsIn(dir, '.ds/features/unclaimed.md'));
  assert.match(runCli(dir, 'sync').stdout, /Code no feature describes/);
});

test('sync restores a base file that has gone missing', () => {
  const dir = repo();
  fs.rmSync(path.join(dir, '.ds/product.md'));
  const r = runCli(dir, 'sync', '--write');
  assert.strictEqual(r.status, 0);
  assert.ok(existsIn(dir, '.ds/product.md'), 'repairing a model includes putting back what it cannot be read without');
  assert.match(r.stdout, /restored/);
});

test('sync never overwrites a base file the user has written', () => {
  const dir = repo();
  writeIn(dir, '.ds/glossary.md', '# Glossary\n\n**Mine** — my own words.\n');
  runCli(dir, 'sync', '--write');
  assert.match(readIn(dir, '.ds/glossary.md'), /my own words/);
});

test('the coverage report says DECIDE, never add', () => {
  const dir = repo();
  writeIn(dir, 'src/unclaimed/other.ts', 'export const other = 1;\n');
  commit(dir);
  assert.match(runCli(dir, 'sync').stdout, /Decide which of these are real features worth describing — most are not/);
});

// ─── creating a model where there is none ──────────────────────────────────
//
// ⚠️ **The empty body is the point, not an omission.** An empty body reports as unwritten, which
// is a worklist. A body pre-filled with a transcription of the code reports as complete — a lie,
// and it buries the very list that would have said what still needs writing. Drafting bodies from
// leading comments once produced 130 "complete" descriptions restating their own signatures.

function freshRepo() {
  return makeRepo({ files: {
    'src/order/place.ts': 'export function placeOrder() {\n  return 1;\n}\n',
    'src/order/cancel.ts': 'export function cancelOrder() {\n  return 2;\n}\n',
    'src/billing/charge.ts': 'export function charge() {\n  return 3;\n}\n',
  }, git: 'committed' });
}

test('one proposal per directory, carrying every file in it', () => {
  const proposals = proposeFeatures(freshRepo(), empty());
  assert.deepStrictEqual(proposals.map((p) => p.name).sort(), ['Billing', 'Order']);
  assert.deepStrictEqual(
    proposals.find((p) => p.name === 'Order').code,
    ['src/order/cancel.ts', 'src/order/place.ts'],
  );
});

test('an already-claimed file is not proposed again', () => {
  const m = model({ features: [{ ...model().features[0], code: ['src/order/place.ts', 'src/order/cancel.ts'] }] });
  assert.deepStrictEqual(proposeFeatures(freshRepo(), m).map((p) => p.name), ['Billing']);
});

test('a proposal says PROVISIONAL, and its body is empty', () => {
  const [p] = proposeFeatures(freshRepo(), empty());
  const rendered = renderProposal(p);
  assert.match(rendered, /PROVISIONAL/);
  assert.match(rendered, /NOT a feature/);
  assert.strictEqual(rendered.split('---')[2].trim(), '', 'a scaffolded body must say nothing');
});

test('guidance lives in frontmatter comments, never in the body', () => {
  const rendered = renderProposal(proposeFeatures(freshRepo(), empty())[0]);
  const [, frontmatter, body] = rendered.split('---');
  assert.match(frontmatter, /^#/m, 'the guidance belongs above the fence');
  assert.ok(!body.includes('#'), 'a body is rendered into the index and billed on every agent call');
});

test('an unwritten feature is NOT stamped — a stamp would say it is current', () => {
  const dir = freshRepo();
  runCli(dir, 'sync', '--write');
  const scaffolded = readIn(dir, '.ds/features/order.md');
  assert.ok(!scaffolded.includes('stamp:'), 'a description that says nothing cannot be current');
  assert.match(scaffolded, /PROVISIONAL/, 'and so the guidance survives for the user to read');
});

test('once a body is written, the next sync stamps it', () => {
  const dir = freshRepo();
  runCli(dir, 'sync', '--write');
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
  const dir = freshRepo();
  runCli(dir, 'sync', '--write');
  assert.ok(existsIn(dir, '.ds/index.md'));
  assert.match(readIn(dir, '.ds/index.md'), /## Src/);
  assert.match(readIn(dir, 'CLAUDE.md'), /\.ds\/index\.md/);
});

test('sync creates the model and proposes features in one go, when there is none yet', () => {
  const dir = freshRepo();
  const r = runCli(dir, 'sync', '--write');
  assert.strictEqual(r.status, 0);
  assert.ok(existsIn(dir, '.ds/product.md'));
  assert.ok(existsIn(dir, '.ds/glossary.md'));
  assert.ok(existsIn(dir, '.ds/features/order.md'));
  assert.match(r.stdout, /provisional/i);
  // ⚠️ And nothing else. The agent surface is `dspec init`'s to write; the command that creates a
  // model must not also reach into directories the user's editor owns.
  assert.ok(!existsIn(dir, '.claude'), '`.claude/` belongs to `dspec init`');
});

test('sync only proposes once — a second `--write` behaves like an ordinary repair', () => {
  // Scaffolding over curated work buries it, and "never delete a feature" is a rule the tool does
  // not get to break on the user's behalf. There is no separate command to run by mistake instead
  // — proposing is simply a first-run act, gated on whether a feature has been named yet.
  const dir = freshRepo();
  runCli(dir, 'sync', '--write');
  const before = readIn(dir, '.ds/features/order.md');
  writeIn(dir, '.ds/features/order.md', before.replace('name: Order', 'name: Order lifecycle'));

  const again = runCli(dir, 'sync', '--write');
  assert.strictEqual(again.status, 0);
  assert.ok(!/proposed/i.test(again.stdout), 'a model that already exists is repaired, not re-scaffolded');
  assert.match(readIn(dir, '.ds/features/order.md'), /Order lifecycle/, 'curated work is untouched');
});

test('a dry run on a repo with no model reports it and creates nothing', () => {
  const dir = freshRepo();
  const r = runCli(dir, 'sync');
  assert.strictEqual(r.status, 0);
  assert.ok(!existsIn(dir, '.ds'), 'only `--write` ever writes, model missing or not');
  assert.match(r.stdout, /no `\.ds\/` here yet/);
});
