'use strict';
// ============================================================
// The command surface, as a real process.
//
// ⚠️ **Two invariants with teeth, and both are about blast radius:**
//   1. Only `sync` writes to `.ds/`.
//   2. Only `check` exits non-zero.
// The second is what lets CI pick its own strictness instead of every command being able to redden
// a pipeline; the first is what makes it safe to run anything else on a model you care about.
// ============================================================
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { makeRepo, runCli, writeIn, commit } = require('../support/repo');

const FEATURE = `---
name: Adder
area: Maths
code: [src/add.ts]
---

Adds two numbers.
`;

const repo = () => makeRepo({ files: {
  'src/add.ts': 'export function add(a, b) {\n  return a + b;\n}\n',
  '.ds/product.md': '---\nname: Calc\n---\n\nA calculator.\n',
  '.ds/features/adder.md': FEATURE,
}, git: 'committed' });

/** Every file under a directory with its content — for proving nothing changed. */
function snapshot(dir, rel) {
  const out = {};
  const walk = (d) => {
    for (const e of fs.readdirSync(path.join(dir, d), { withFileTypes: true })) {
      const p = `${d}/${e.name}`;
      if (e.isDirectory()) walk(p);
      else out[p] = fs.readFileSync(path.join(dir, p), 'utf-8');
    }
  };
  walk(rel);
  return out;
}

const READ_ONLY = [['spec', 'Adder'], ['sync']];

for (const args of READ_ONLY) {
  test(`\`ds ${args.join(' ')}\` does not write to .ds/`, () => {
    const dir = repo();
    const before = snapshot(dir, '.ds');
    runCli(dir, ...args);
    assert.deepStrictEqual(snapshot(dir, '.ds'), before);
  });
}

test('`dspec sync --write` is the one that writes', () => {
  const dir = repo();
  const before = snapshot(dir, '.ds');
  runCli(dir, 'sync', '--write');
  assert.notDeepStrictEqual(snapshot(dir, '.ds'), before);
});

test('nothing exits non-zero unless you ask for it', () => {
  const dir = makeRepo({ files: { '.ds/features/a.md': '---\nname: A\narea: X\ncode: [gone.ts]\n---\n\nBody.\n' }, git: 'committed' });
  for (const args of [['sync', '--write'], ['sync'], ['spec', 'A']]) {
    assert.strictEqual(runCli(dir, ...args).status, 0, `ds ${args.join(' ')} must not fail the build`);
  }
  // Opt-in, because a pipeline chooses its own strictness — and a command that failed by default
  // would make every other use of it a hazard.
  assert.strictEqual(runCli(dir, 'sync', '--strict').status, 1, 'a declared file that is gone is a measured fact');
});

test('--strict passes on a repo that agrees, and code without a feature never fails it', () => {
  const dir = repo();
  runCli(dir, 'sync', '--write');
  commit(dir);
  assert.strictEqual(runCli(dir, 'sync', '--strict').status, 0);
  writeIn(dir, 'src/undescribed.ts', 'export const x = 1;\n');
  commit(dir);
  const r = runCli(dir, 'sync', '--strict');
  assert.strictEqual(r.status, 0, 'a gate that reddens on every new file teaches people to route around it');
  assert.match(r.stdout, /Code no feature describes/);
});

test('an unknown command prints the usage and exits 2', () => {
  const r = runCli(repo(), 'nonsense');
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /no such command/);
});

test('the usage states both invariants, and lists one flat set of verbs', () => {
  // Collapsed, because the usage is hard-wrapped and an invariant must not be assertable only
  // when it happens to fit on one line.
  const r = runCli(repo(), '--help');
  const flat = r.stdout.replace(/\s+/g, ' ');
  assert.match(flat, /only those two write to `\.ds\/`/);
  assert.match(flat, /Nothing exits non-zero unless you ask for it/);
  // ⚠️ The two-tier listing is what let `init`, `drift` and `doctor` survive as verbs that existed
  // only because something used to call them. One kind of command, one list.
  assert.ok(!/WHAT YOU TYPE|WHAT THE HOOKS/.test(r.stdout), 'there is only one kind of command');
});

test('every verb is a command a user can name', () => {
  // ⚠️ The rule that keeps this surface from silting up again: if a user cannot name it, it is not
  // a command, and its job belongs to a flag on one they can. `drift`, `doctor`, `pack`, `whose`,
  // `check`, `version` and `update` all went that way — the last two most recently, `version`
  // because the number people ask for is a flag and the health report nobody asked for was
  // burying it.
  const { VERBS } = require('../../dist/cli/index.js');
  assert.deepStrictEqual([...VERBS].sort(), ['bootstrap', 'init', 'spec', 'sync']);
});

test('`sync` refuses to stand in for `bootstrap`', () => {
  // They are different intentions. Repairing nothing is not a repair, and quietly creating a model
  // here would mean "set this repo up" and "fix the drift" could not be told apart.
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n' }, git: 'committed' });
  const r = runCli(dir, 'sync', '--write');
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /dspec bootstrap/);
});

test('every command works from a subdirectory', () => {
  const dir = repo();
  fs.mkdirSync(path.join(dir, 'src/deep/deeper'), { recursive: true });
  const r = runCli(path.join(dir, 'src/deep/deeper'), 'sync');
  assert.notStrictEqual(r.status, 2);
  assert.ok(!/no `\.ds\/` found/.test(r.stderr));
});

test('a model file with a syntax error names the file and the line, without a stack trace', () => {
  const dir = makeRepo({ files: { '.ds/features/a.md': '---\nname: A\n\tcode: [a.ts]\n---\n\nBody.\n' } });
  const r = runCli(dir, 'sync');
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /line 3/);
  assert.ok(!r.stderr.includes('at Object.'), 'a stack trace pushes the useful line off the screen');
});
