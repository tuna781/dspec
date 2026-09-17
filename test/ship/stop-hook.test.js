'use strict';
// ============================================================
// The Stop hook — what makes the product model maintain itself in Claude Code.
//
// ⚠️ It holds the AGENT, once, and only for work the model owes because of this work. Everything here
// runs the hook exactly as Claude Code does: installed by `dspec init`, fed a payload on stdin.
// ============================================================
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { makeRepo, runCli, writeIn, commit, BIN } = require('../support/repo');

const FEATURE = `---
name: Adder
area: Maths
code: [src/add.ts]
---

Adds two numbers.
`;

/** A repo whose model agrees with its code, with dspec installed for Claude and everything committed. */
function agreeing() {
  const dir = makeRepo({ files: {
    'src/add.ts': 'export function add(a: number, b: number) {\n  return a + b;\n}\n',
    '.ds/product.md': '---\nname: Calc\n---\n\nA calculator.\n',
    '.ds/features/adder.md': FEATURE,
  }, git: 'committed' });
  spawnSync(process.execPath, [BIN, 'init', '--agent', 'claude', '--yes'], { cwd: dir, encoding: 'utf-8' });
  runCli(dir, 'sync', '--write');
  commit(dir);
  return dir;
}

function stop(dir, payload = {}) {
  const r = spawnSync(process.execPath, [path.join(dir, '.claude/hooks/dspec/stop.js')], {
    cwd: dir,
    input: JSON.stringify({ cwd: dir, stop_hook_active: false, ...payload }),
    encoding: 'utf-8',
    timeout: 60_000,
  });
  return { status: r.status, out: r.stdout ? JSON.parse(r.stdout) : null };
}

test('a model that agrees with the code lets the agent stop', () => {
  const dir = agreeing();
  const r = stop(dir);
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.out, null);
});

test('a description older than its code keeps the agent working, with the reason', () => {
  const dir = agreeing();
  writeIn(dir, 'src/add.ts', 'export function add(a: number, b: number) {\n  return a - b;\n}\n');
  const r = stop(dir);
  assert.strictEqual(r.status, 0, 'a hook never fails');
  assert.strictEqual(r.out.decision, 'block');
  assert.match(r.out.reason, /Adder/);
  assert.match(r.out.reason, /accept "Adder"/);
});

test('new source no feature claims keeps the agent working', () => {
  const dir = agreeing();
  writeIn(dir, 'src/sub.ts', 'export function sub(a: number, b: number) {\n  return a - b;\n}\n');
  const r = stop(dir);
  assert.strictEqual(r.out.decision, 'block');
  assert.match(r.out.reason, /no feature claims src\/sub\.ts/);
});

test('code that was undescribed before this work does not hold the agent', () => {
  // That backlog is /ds-bootstrap's. Dumping it on every turn would make each one endless.
  const dir = agreeing();
  writeIn(dir, 'src/old.ts', 'export const old = 1;\n');
  commit(dir);
  assert.strictEqual(stop(dir).out, null);
});

test('a turn already continued by the hook is never held again', () => {
  const dir = agreeing();
  writeIn(dir, 'src/add.ts', 'export function add(a: number, b: number) {\n  return a * b;\n}\n');
  const r = stop(dir, { stop_hook_active: true });
  assert.strictEqual(r.status, 0);
  assert.ok(!r.out.decision, 'no second block — that is how a hook loops forever');
  assert.match(r.out.systemMessage, /still owes/);
});
