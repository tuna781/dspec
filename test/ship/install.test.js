'use strict';
// ============================================================
// What a user's repository actually receives — and, far more importantly, what it does not.
//
// ⚠️ **`dspec init` owns exactly what carries the `dspec` prefix, and rebuilds exactly that.** Every
// run deletes what dspec installed and writes it again, so an upgrade leaves nothing stale. Most of
// this file defends the other half of that sentence: nothing WITHOUT the prefix is ever written or
// removed — not a user's own command, not their hooks, not their memory file.
//
// ⚠️ **`sync` owns `.ds/` and nothing else.** Installing the agent surface is `init`'s job.
// Keeping them apart is what stops "set the tooling up" from carrying the power to invent a model.
// ============================================================
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { makeRepo, runCli, readIn, existsIn, writeIn, BIN, ROOT } = require('../support/repo');

/**
 * `dspec init` with `CODEX_HOME` redirected into the throwaway repo.
 *
 * ⚠️ Without this every run of the suite would write into the machine's real `~/.codex/prompts`.
 * A test that touches the developer's home directory is a test that has already failed.
 */
function init(dir, ...args) {
  return spawnSync(process.execPath, [BIN, 'init', ...args], {
    cwd: dir,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 60_000,
    env: { ...process.env, CODEX_HOME: path.join(dir, '.codex-home') },
  });
}

const CODEX_PROMPT = '.codex-home/prompts/dspec-sync.md';

// ─── each agent gets its own shape ──────────────────────────────────────────

test('every agent receives all four commands, in its own syntax', () => {
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n' } });
  assert.strictEqual(init(dir, '--all', '--yes').status, 0);

  for (const name of ['spec', 'plan', 'sync', 'update']) {
    assert.ok(existsIn(dir, `.claude/commands/dspec-${name}.md`), `claude is missing /dspec-${name}`);
    assert.ok(existsIn(dir, `.agents/skills/dspec-${name}/SKILL.md`), `cursor is missing /dspec-${name}`);
    assert.ok(existsIn(dir, `.codex-home/prompts/dspec-${name}.md`), `codex is missing /dspec-${name}`);
  }
  assert.ok(existsIn(dir, '.claude/skills/dspec/SKILL.md'));
  assert.ok(existsIn(dir, '.agents/skills/dspec/SKILL.md'));
  for (const h of ['_ds.js', 'session-start.js', 'post-edit.js', 'stop.js']) {
    assert.ok(existsIn(dir, `.claude/hooks/dspec/${h}`), `claude is missing the ${h} hook`);
  }
});

test('the frontmatter is translated, not copied', () => {
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n' } });
  init(dir, '--all', '--yes');

  // Claude honours a tool list; the other two have no such thing, and a key they ignore would
  // read as a fence that is not there.
  assert.match(readIn(dir, '.claude/commands/dspec-spec.md'), /allowed-tools:/);
  assert.ok(!/allowed-tools:/.test(readIn(dir, CODEX_PROMPT)), 'codex honours no tool list');
  assert.ok(!/allowed-tools:/.test(readIn(dir, '.agents/skills/dspec-spec/SKILL.md')), 'cursor honours no tool list');

  // Cursor identifies a skill by `name`, and it has to match the directory or the slash command
  // is not the one we told the user to type.
  assert.match(readIn(dir, '.agents/skills/dspec-spec/SKILL.md'), /^---\nname: dspec-spec\n/);
});

test('an argument reaches every agent in a form it understands', () => {
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n' } });
  init(dir, '--all', '--yes');

  // Claude and Codex both expand `$ARGUMENTS` — the WHOLE request. `$1` is its first word only, so
  // `/dspec-spec add a coupon field` used to reach the agent as "Turn add into…". A Cursor skill has
  // no variable at all, so leaving a token there would have the agent asking about nothing.
  assert.match(readIn(dir, '.claude/commands/dspec-spec.md'), /\$ARGUMENTS/);
  assert.match(readIn(dir, '.codex-home/prompts/dspec-spec.md'), /\$ARGUMENTS/);
  assert.ok(!/\$1\b/.test(readIn(dir, '.claude/commands/dspec-spec.md')), 'the first word is not the request');
  assert.ok(!/\$ARGUMENTS|\$1\b/.test(readIn(dir, '.agents/skills/dspec-spec/SKILL.md')), 'cursor has no variable to expand');
});

test('no agent is promised a fence it does not have', () => {
  // `/dspec-spec` must not write. In Claude that is enforced by the tool list; in the other two
  // nothing enforces it, and the prose has to say so rather than describing a mechanism that is
  // not running.
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n' } });
  init(dir, '--all', '--yes');

  assert.match(readIn(dir, '.claude/commands/dspec-spec.md'), /enforced/);
  for (const rel of ['.codex-home/prompts/dspec-spec.md', '.agents/skills/dspec-spec/SKILL.md']) {
    assert.match(readIn(dir, rel), /no tool list to enforce it/, `${rel} must admit there is no fence`);
  }
});

// ─── rebuild, never accumulate ──────────────────────────────────────────────

test('a re-run rebuilds everything dspec installed — edits and stale files do not survive', () => {
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n' } });
  init(dir, '--all', '--yes');
  const fresh = readIn(dir, '.claude/commands/dspec-sync.md');

  writeIn(dir, '.claude/commands/dspec-sync.md', 'EDITED\n');
  writeIn(dir, '.claude/commands/dspec-gone.md', 'a command an older dspec had\n');
  writeIn(dir, '.claude/hooks/dspec/old-hook.js', '// dropped upstream\n');
  writeIn(dir, '.agents/skills/dspec-gone/SKILL.md', 'stale\n');
  writeIn(dir, '.codex-home/prompts/dspec-gone.md', 'stale\n');

  const r = init(dir, '--all', '--yes');
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(readIn(dir, '.claude/commands/dspec-sync.md'), fresh, 'rebuilt from the template');
  for (const rel of ['.claude/commands/dspec-gone.md', '.claude/hooks/dspec/old-hook.js', '.agents/skills/dspec-gone', '.codex-home/prompts/dspec-gone.md']) {
    assert.ok(!existsIn(dir, rel), `${rel} is dspec's and no longer shipped — it must be gone`);
  }
  assert.match(r.stdout, /removed/);
});

test('a second run with the same version leaves every file byte-identical', () => {
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n' } });
  init(dir, '--all', '--yes');
  const before = snapshot(dir);
  const r = init(dir, '--all', '--yes');
  assert.strictEqual(r.status, 0);
  assert.deepStrictEqual(snapshot(dir), before, 'rebuilding what is already current changes nothing');
});

test('nothing without the prefix is ever touched', () => {
  const dir = makeRepo({ files: {
    'src/a.ts': 'export const a = 1;\n',
    '.claude/commands/mine.md': 'my own command\n',
    '.claude/skills/mine/SKILL.md': 'my own skill\n',
    '.claude/hooks/mine.js': '// my own hook\n',
    '.agents/skills/mine/SKILL.md': 'mine\n',
    '.codex-home/prompts/mine.md': 'mine\n',
    'AGENTS.md': 'my own notes\n',
    'CLAUDE.md': 'my own claude notes\n',
  } });
  init(dir, '--all', '--yes');
  init(dir, '--all', '--yes');

  assert.strictEqual(readIn(dir, '.claude/commands/mine.md'), 'my own command\n');
  assert.strictEqual(readIn(dir, '.claude/skills/mine/SKILL.md'), 'my own skill\n');
  assert.strictEqual(readIn(dir, '.claude/hooks/mine.js'), '// my own hook\n');
  assert.strictEqual(readIn(dir, '.agents/skills/mine/SKILL.md'), 'mine\n');
  assert.strictEqual(readIn(dir, '.codex-home/prompts/mine.md'), 'mine\n');
  assert.strictEqual(readIn(dir, 'AGENTS.md'), 'my own notes\n');
  assert.strictEqual(readIn(dir, 'CLAUDE.md'), 'my own claude notes\n');
});

test('an install from before the prefix is replaced — and a look-alike the user wrote is kept', () => {
  const dspecHook = "const { readInput } = require('./_ds');\n";
  const dir = makeRepo({ files: {
    'src/a.ts': 'export const a = 1;\n',
    '.claude/commands/ds-sync.md': '---\ndescription: Repair the dspec model\n---\nRun `dspec sync`.\n',
    '.claude/commands/ds-bootstrap.md': '---\ndescription: Create the dspec model\n---\nRun `dspec sync --write`.\n',
    '.claude/commands/ds-deploy.md': 'my own deploy command\n',
    '.claude/skills/ds/SKILL.md': '---\nname: ds\n---\nWorking against a dspec model.\n',
    '.claude/hooks/_ds.js': '// Shared base for the three DSpec hooks.\n',
    '.claude/hooks/stop.js': dspecHook,
    '.claude/hooks/session-start.js': '// my own session hook, nothing to do with that tool\n',
    '.agents/skills/ds-spec/SKILL.md': '---\nname: ds-spec\n---\nRun `dspec spec`.\n',
    '.codex-home/prompts/ds-plan.md': 'Everything `/ds-spec` does, and then the plan and the build.\n',
    '.claude/settings.json': JSON.stringify({ hooks: {
      Stop: [{ hooks: [{ type: 'command', command: 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/stop.js"', timeout: 10 }] }],
    } }, null, 2),
  } });

  const r = init(dir, '--all', '--yes');
  assert.strictEqual(r.status, 0, r.stderr);

  for (const rel of ['.claude/commands/ds-sync.md', '.claude/commands/ds-bootstrap.md', '.claude/skills/ds', '.claude/hooks/_ds.js', '.claude/hooks/stop.js', '.agents/skills/ds-spec', '.codex-home/prompts/ds-plan.md']) {
    assert.ok(!existsIn(dir, rel), `${rel} was written by an older dspec and must be gone`);
  }
  assert.strictEqual(readIn(dir, '.claude/commands/ds-deploy.md'), 'my own deploy command\n', 'a `ds-` name alone proves nothing');
  assert.match(readIn(dir, '.claude/hooks/session-start.js'), /my own session hook/, 'a generic hook name alone proves nothing');

  const settings = JSON.parse(readIn(dir, '.claude/settings.json'));
  const commands = JSON.stringify(settings.hooks);
  assert.ok(!commands.includes('.claude/hooks/stop.js'), 'the old hook entry went with its script');
  assert.ok(commands.includes('.claude/hooks/dspec/stop.js'));
});

test('an agent no longer chosen is removed; Codex, shared by every repo, is left alone', () => {
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n' } });
  init(dir, '--all', '--yes');
  init(dir, '--agent', 'claude', '--yes');

  assert.ok(existsIn(dir, '.claude/commands/dspec-sync.md'));
  assert.ok(!existsIn(dir, '.agents/skills/dspec-sync'), 'cursor was installed here and not chosen again');
  assert.ok(existsIn(dir, CODEX_PROMPT), 'codex lives in the home directory — not this repo’s to uninstall');
});

// ─── settings.json: only dspec's own hook entries ───────────────────────────

test('settings.json keeps every key that was already in it', () => {
  const dir = makeRepo({ files: {
    'src/a.ts': 'export const a = 1;\n',
    '.claude/settings.json': JSON.stringify({ env: { MINE: '1' }, permissions: { allow: ['Bash'] } }, null, 2),
  } });
  init(dir, '--agent', 'claude', '--yes');

  const settings = JSON.parse(readIn(dir, '.claude/settings.json'));
  assert.strictEqual(settings.env.MINE, '1');
  assert.deepStrictEqual(settings.permissions.allow, ['Bash']);
  assert.ok(settings.hooks.SessionStart, 'the hooks have to be wired');
});

test("the user's own hooks survive, and dspec's are wired beside them exactly once", () => {
  const dir = makeRepo({ files: {
    'src/a.ts': 'export const a = 1;\n',
    '.claude/settings.json': JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: 'command', command: 'mine' }] }] } }, null, 2),
  } });
  init(dir, '--agent', 'claude', '--yes');
  init(dir, '--agent', 'claude', '--yes');

  const settings = JSON.parse(readIn(dir, '.claude/settings.json'));
  assert.strictEqual(settings.hooks.Stop[0].hooks[0].command, 'mine', 'theirs first, untouched');
  const ours = JSON.stringify(settings.hooks).match(/\.claude\/hooks\/dspec\/stop\.js/g) || [];
  assert.strictEqual(ours.length, 1, 'rebuilt, never duplicated');
  assert.ok(settings.hooks.SessionStart, 'and the other events are wired even though `hooks` already existed');
});

test('an unreadable settings file is refused, never replaced', () => {
  const dir = makeRepo({ files: {
    'src/a.ts': 'export const a = 1;\n',
    '.claude/settings.json': '{ this is not json',
  } });
  const r = init(dir, '--agent', 'claude', '--yes');

  assert.strictEqual(readIn(dir, '.claude/settings.json'), '{ this is not json', "the user's file is theirs");
  assert.match(r.stdout, /NOTHING was written/);
  assert.strictEqual(r.status, 0, 'reported, not a gate');
});

// ─── choosing agents ────────────────────────────────────────────────────────

test('with nobody to ask, it refuses to guess a first install', () => {
  // ⚠️ Writing into somebody's `.claude/` because a CI script ran a bare `dspec init` is exactly
  // the surprise this must not spring.
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n' } });
  const r = init(dir, '--yes');

  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /--agent|--all/);
  assert.ok(!existsIn(dir, '.claude/commands'), 'nothing may be written when nothing was chosen');
});

test('an agent nobody supports is named, not silently dropped', () => {
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n' } });
  const r = init(dir, '--agent', 'claude,copilot', '--yes');

  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /copilot/);
  assert.ok(!existsIn(dir, '.claude/commands'), 'a typo must not half-install');
});

test('only the agents chosen are written', () => {
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n' } });
  init(dir, '--agent', 'cursor', '--yes');

  assert.ok(existsIn(dir, '.agents/skills/dspec-sync/SKILL.md'));
  assert.ok(!existsIn(dir, '.claude/commands'), 'claude was not asked for');
  assert.ok(!existsIn(dir, '.codex-home'), 'codex was not asked for');
});

test('with nobody to ask, a repo that has dspec gets the same agents rebuilt', () => {
  // This is what `/dspec-update` runs from inside a session.
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n' } });
  init(dir, '--agent', 'cursor', '--yes');
  const r = init(dir, '--yes');
  assert.strictEqual(r.status, 0, r.stderr);
  assert.ok(existsIn(dir, '.agents/skills/dspec-sync/SKILL.md'));
  assert.ok(!existsIn(dir, '.claude/commands'), 'only what was installed is rebuilt');
});

// ─── what init does NOT do ──────────────────────────────────────────────────

test('init installs the surface and does not invent a model', () => {
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n' } });
  const r = init(dir, '--all', '--yes');

  assert.ok(!existsIn(dir, '.ds/product.md'), '`sync --write` creates the model, and only it');
  assert.match(r.stdout, /\/dspec-sync/, 'and the next step has to be named');
});

test('`sync --write` seeds the model and touches no agent directory', () => {
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n' } });
  assert.strictEqual(runCli(dir, 'sync', '--write').status, 0);

  assert.ok(existsIn(dir, '.ds/product.md'));
  assert.ok(existsIn(dir, '.ds/glossary.md'));
  assert.ok(existsIn(dir, '.ds/features'));
  for (const rel of ['.claude', '.agents', '.cursor']) {
    assert.ok(!existsIn(dir, rel), `${rel} is \`init\`'s to write, not \`sync\`'s`);
  }
});

test('a second `sync --write` touches nothing the user has edited', () => {
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n' } });
  runCli(dir, 'sync', '--write');
  writeIn(dir, '.ds/product.md', '---\nname: Mine\n---\n\nMy own words.\n');
  runCli(dir, 'sync', '--write');
  assert.match(readIn(dir, '.ds/product.md'), /My own words/);
});

// ─── the memory files ───────────────────────────────────────────────────────

test('sync renders the memory file each installed agent actually reads', () => {
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n' } });
  init(dir, '--agent', 'claude,cursor', '--yes');
  runCli(dir, 'sync', '--write');

  assert.ok(existsIn(dir, 'CLAUDE.md'), 'Claude Code reads this one');
  assert.ok(existsIn(dir, 'AGENTS.md'), 'Cursor reads this one');
  // Only `AGENTS.md` carries it: Claude has a SessionStart hook that does the same job, and a
  // paragraph telling it to do what a hook already did is noise on every turn.
  assert.match(readIn(dir, 'AGENTS.md'), /At the start of a session/);
  assert.ok(!/At the start of a session/.test(readIn(dir, 'CLAUDE.md')));
});

test('a repo with one agent gets one memory file', () => {
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n' } });
  init(dir, '--agent', 'claude', '--yes');
  runCli(dir, 'sync', '--write');

  assert.ok(existsIn(dir, 'CLAUDE.md'));
  assert.ok(!existsIn(dir, 'AGENTS.md'), 'nothing here reads it');
});

// ─── the hooks, once installed ──────────────────────────────────────────────

test('a hook finds dspec after a real global install', () => {
  // ⚠️ **This shape is the whole test.** `npm i -g dspec` puts a SYMLINK at `<prefix>/bin/dspec`
  // pointing into `<prefix>/lib/node_modules/dspec`. Derive the package root from that symlink's
  // grandparent and you get `<prefix>`, which holds no `dist/` — so the hook's `require` throws,
  // the catch turns it into exit 0, and the hook silently stops speaking.
  //
  // Running the suite from a checkout hides this completely: there the derivation happens to land
  // on the right directory. So the layout has to be built by hand.
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n' } });
  const pkg = path.join(dir, 'prefix', 'lib', 'node_modules', 'dspec');
  fs.mkdirSync(path.join(pkg, 'dist', 'model'), { recursive: true });
  fs.mkdirSync(path.join(pkg, 'bin'), { recursive: true });
  fs.writeFileSync(path.join(pkg, 'dist', 'model', 'load.js'), 'module.exports = { loadModel: () => "found" };\n');
  fs.writeFileSync(path.join(pkg, 'bin', 'ds.js'), '#!/usr/bin/env node\n');
  fs.mkdirSync(path.join(dir, 'prefix', 'bin'), { recursive: true });
  fs.symlinkSync(path.join('..', 'lib', 'node_modules', 'dspec', 'bin', 'ds.js'), path.join(dir, 'prefix', 'bin', 'dspec'));

  const { dspecModule } = require(path.join(ROOT, 'templates', 'hooks', '_ds.js'));

  // What `dspec init` writes today: the root recorded outright.
  writeIn(dir, '.ds/config.json', JSON.stringify({ cli: path.join(dir, 'prefix/bin/dspec'), root: pkg }));
  assert.strictEqual(dspecModule(dir, 'dist', 'model', 'load.js').loadModel(), 'found');

  // What an OLDER dspec wrote: only `cli`. The symlink still has to be followed, or upgrading
  // dspec would leave every already-installed repo's hooks silently dead.
  writeIn(dir, '.ds/config.json', JSON.stringify({ cli: path.join(dir, 'prefix/bin/dspec') }));
  assert.strictEqual(dspecModule(dir, 'dist', 'model', 'load.js').loadModel(), 'found');

  // And a config pointing at nothing must return null rather than throwing: the caller's catch
  // is what turns a throw into a silent hook.
  writeIn(dir, '.ds/config.json', JSON.stringify({ cli: path.join(dir, 'gone', 'dspec') }));
  assert.strictEqual(dspecModule(dir, 'dist', 'model', 'load.js'), null);
});

test('`dspec init` records where dspec actually lives', () => {
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n' } });
  init(dir, '--agent', 'claude', '--yes');

  const cfg = JSON.parse(readIn(dir, '.ds/config.json'));
  assert.ok(fs.existsSync(path.join(cfg.root, 'dist', 'model', 'load.js')),
    '`root` must be the directory dspec\'s modules are actually under');
  assert.ok(fs.existsSync(path.join(cfg.root, 'templates')), 'and the templates, which init reads');
});

/** Every file under the repo, with its content — for proving a run changed nothing. */
function snapshot(dir) {
  const out = {};
  (function walk(rel) {
    for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
      if (e.name === '.git') continue;
      const next = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(next);
      else out[next] = fs.readFileSync(path.join(dir, next), 'utf-8');
    }
  })('');
  return out;
}

test('`init` then `sync --write` still proposes a model — config.json is not one', () => {
  // `init` writes `.ds/config.json`. A model check that only asked "does `.ds/` exist" made the
  // first `sync --write` repair an empty model instead of proposing features.
  const dir = makeRepo({ files: { 'src/order/place.ts': 'export function placeOrder() {\n  return 1;\n}\n' }, git: 'committed' });
  init(dir, '--agent', 'claude', '--yes');
  const r = runCli(dir, 'sync', '--write');
  assert.match(r.stdout, /proposed 1 feature/);
});
