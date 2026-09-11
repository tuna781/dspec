'use strict';
// ============================================================
// `dspec sync` end to end, as a real process.
//
// ⚠️ **The invariant with teeth: `--write` RE-MEASURES, it does not rewrite prose.** Everything a
// person wrote must come back byte for byte. A sync that "tidies" a body is a sync that silently
// decides the code was right and the description was wrong.
// ============================================================
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { makeRepo, writeIn, readIn, existsIn, runCli, commit } = require('../support/repo');

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

test('sync NEVER invents a feature — it lists undescribed code instead', () => {
  // Which files deserve a feature is a judgement. A repair command that answered it would fill a
  // curated model with directories; `dspec bootstrap` is the one command allowed to propose.
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
