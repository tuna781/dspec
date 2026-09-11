'use strict';
// ============================================================
// What a user's repository actually receives — and, far more importantly, what it does not.
//
// ⚠️ **`dspec init` has exactly one rule: add what is absent, never touch what is there.** Most
// of this file exists to defend that single sentence, because it is the rule a future refactor
// will be most tempted to soften — "surely we can overwrite a file WE wrote" is how a tool starts
// replacing work somebody did by hand.
//
// ⚠️ **`bootstrap` owns `.ds/` and nothing else.** Installing the agent surface is `init`'s job.
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

const CODEX_PROMPT = '.codex-home/prompts/ds-sync.md';

// ─── each agent gets its own shape ──────────────────────────────────────────

test('every agent receives all four commands, in its own syntax', () => {
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n' } });
  assert.strictEqual(init(dir, '--all', '--yes').status, 0);

  for (const name of ['bootstrap', 'spec', 'plan', 'sync']) {
    assert.ok(existsIn(dir, `.claude/commands/ds-${name}.md`), `claude is missing /ds-${name}`);
    assert.ok(existsIn(dir, `.agents/skills/ds-${name}/SKILL.md`), `cursor is missing /ds-${name}`);
    assert.ok(existsIn(dir, `.codex-home/prompts/ds-${name}.md`), `codex is missing /ds-${name}`);
  }
  assert.ok(existsIn(dir, '.claude/skills/ds/SKILL.md'));
  assert.ok(existsIn(dir, '.agents/skills/ds/SKILL.md'));
  for (const h of ['_ds.js', 'session-start.js', 'post-edit.js', 'stop.js']) {
    assert.ok(existsIn(dir, `.claude/hooks/${h}`), `claude is missing the ${h} hook`);
  }
});

test('the frontmatter is translated, not copied', () => {
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n' } });
  init(dir, '--all', '--yes');

  // Claude honours a tool list; the other two have no such thing, and a key they ignore would
  // read as a fence that is not there.
  assert.match(readIn(dir, '.claude/commands/ds-spec.md'), /allowed-tools:/);
  assert.ok(!/allowed-tools:/.test(readIn(dir, CODEX_PROMPT)), 'codex honours no tool list');
  assert.ok(!/allowed-tools:/.test(readIn(dir, '.agents/skills/ds-spec/SKILL.md')), 'cursor honours no tool list');

  // Cursor identifies a skill by `name`, and it has to match the directory or the slash command
  // is not the one we told the user to type.
  assert.match(readIn(dir, '.agents/skills/ds-spec/SKILL.md'), /^---\nname: ds-spec\n/);
});

test('an argument reaches every agent in a form it understands', () => {
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n' } });
  init(dir, '--all', '--yes');

  // Claude and Codex both expand `$1`. A Cursor skill has no variable at all, so leaving the
  // token there would have the agent asking the user about a `$1` that means nothing.
  assert.match(readIn(dir, '.claude/commands/ds-spec.md'), /\$1/);
  assert.match(readIn(dir, '.codex-home/prompts/ds-spec.md'), /\$1/);
  assert.ok(!/\$1/.test(readIn(dir, '.agents/skills/ds-spec/SKILL.md')), 'cursor has no $1 to expand');
});

test('no agent is promised a fence it does not have', () => {
  // `/ds-spec` must not write. In Claude that is enforced by the tool list; in the other two
  // nothing enforces it, and the prose has to say so rather than describing a mechanism that is
  // not running.
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n' } });
  init(dir, '--all', '--yes');

  assert.match(readIn(dir, '.claude/commands/ds-spec.md'), /enforced/);
  for (const rel of ['.codex-home/prompts/ds-spec.md', '.agents/skills/ds-spec/SKILL.md']) {
    assert.match(readIn(dir, rel), /no tool list to enforce it/, `${rel} must admit there is no fence`);
  }
});

// ─── the one rule ───────────────────────────────────────────────────────────

test('a file that already exists is left byte-identical, whoever wrote it', () => {
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n' } });
  init(dir, '--all', '--yes');

  writeIn(dir, '.claude/commands/ds-sync.md', 'MINE\n');
  writeIn(dir, '.agents/skills/ds-spec/SKILL.md', 'ALSO MINE\n');
  writeIn(dir, CODEX_PROMPT, 'MINE TOO\n');

  const r = init(dir, '--all', '--yes');
  assert.strictEqual(r.status, 0);
  assert.strictEqual(readIn(dir, '.claude/commands/ds-sync.md'), 'MINE\n');
  assert.strictEqual(readIn(dir, '.agents/skills/ds-spec/SKILL.md'), 'ALSO MINE\n');
  assert.strictEqual(readIn(dir, CODEX_PROMPT), 'MINE TOO\n');
});

test('there is no flag that turns the rule off', () => {
  // ⚠️ A `--force` is a flag somebody passes out of habit, and then the rule protects nobody.
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n' } });
  init(dir, '--all', '--yes');
  writeIn(dir, '.claude/commands/ds-sync.md', 'MINE\n');

  const r = init(dir, '--all', '--yes', '--force');
  assert.notStrictEqual(r.status, 0, '--force must not be a thing this command accepts');
  assert.strictEqual(readIn(dir, '.claude/commands/ds-sync.md'), 'MINE\n');
});

test('a second run changes nothing at all and says so', () => {
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n' } });
  init(dir, '--all', '--yes');
  const before = snapshot(dir);

  const r = init(dir, '--all', '--yes');
  assert.deepStrictEqual(snapshot(dir), before, 'a re-run must be a no-op on disk');
  // Said out loud, every time: somebody who upgrades dspec and sees nothing change has to be
  // told why, not left to conclude the upgrade failed.
  assert.match(r.stdout, /left alone/);
  assert.match(r.stdout, /delete it and run/);
});

test('a file dspec has no business touching is never touched', () => {
  const dir = makeRepo({ files: {
    'src/a.ts': 'export const a = 1;\n',
    '.claude/commands/mine.md': 'my own command\n',
    'AGENTS.md': 'my own notes\n',
  } });
  init(dir, '--all', '--yes');

  assert.strictEqual(readIn(dir, '.claude/commands/mine.md'), 'my own command\n');
  assert.strictEqual(readIn(dir, 'AGENTS.md'), 'my own notes\n');
});

// ─── the one file that is merged rather than created ────────────────────────

test('settings.json keeps every key that was already in it', () => {
  const dir = makeRepo({ files: {
    'src/a.ts': 'export const a = 1;\n',
    '.claude/settings.json': JSON.stringify({ env: { MINE: '1' }, permissions: { allow: ['Bash'] } }, null, 2),
  } });
  init(dir, '--agent', 'claude', '--yes');

  const settings = JSON.parse(readIn(dir, '.claude/settings.json'));
  assert.strictEqual(settings.env.MINE, '1');
  assert.deepStrictEqual(settings.permissions.allow, ['Bash']);
  assert.ok(settings.hooks.SessionStart, 'the hooks still have to be wired');
});

test('a hooks block the user wrote is left alone, not merged into', () => {
  const dir = makeRepo({ files: {
    'src/a.ts': 'export const a = 1;\n',
    '.claude/settings.json': JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: 'command', command: 'mine' }] }] } }, null, 2),
  } });
  const r = init(dir, '--agent', 'claude', '--yes');

  const settings = JSON.parse(readIn(dir, '.claude/settings.json'));
  assert.deepStrictEqual(settings.hooks.Stop[0].hooks[0].command, 'mine');
  assert.ok(!settings.hooks.SessionStart, 'their `hooks` is theirs — the same rule, one level deeper');
  assert.match(r.stdout, /already declares `hooks`/, 'and it has to be said, or the hooks look wired');
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

test('with nobody to ask, it refuses to guess', () => {
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

  assert.ok(existsIn(dir, '.agents/skills/ds-sync/SKILL.md'));
  assert.ok(!existsIn(dir, '.claude/commands'), 'claude was not asked for');
  assert.ok(!existsIn(dir, '.codex-home'), 'codex was not asked for');
});

// ─── what init does NOT do ──────────────────────────────────────────────────

test('init installs the surface and does not invent a model', () => {
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n' } });
  const r = init(dir, '--all', '--yes');

  assert.ok(!existsIn(dir, '.ds/product.md'), '`bootstrap` creates the model, and only it');
  assert.match(r.stdout, /ds-bootstrap/, 'and the next step has to be named');
});

test('bootstrap seeds the model and touches no agent directory', () => {
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n' } });
  assert.strictEqual(runCli(dir, 'bootstrap', '--here', '--yes').status, 0);

  assert.ok(existsIn(dir, '.ds/product.md'));
  assert.ok(existsIn(dir, '.ds/glossary.md'));
  assert.ok(existsIn(dir, '.ds/features'));
  for (const rel of ['.claude', '.agents', '.cursor']) {
    assert.ok(!existsIn(dir, rel), `${rel} is \`init\`'s to write, not bootstrap's`);
  }
});

test('a second bootstrap touches nothing the user has edited', () => {
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n' } });
  runCli(dir, 'bootstrap', '--here', '--yes');
  writeIn(dir, '.ds/product.md', '---\nname: Mine\n---\n\nMy own words.\n');
  runCli(dir, 'bootstrap', '--here', '--yes');
  assert.match(readIn(dir, '.ds/product.md'), /My own words/);
});

// ─── the memory files ───────────────────────────────────────────────────────

test('sync renders the memory file each installed agent actually reads', () => {
  const dir = makeRepo({ files: { 'src/a.ts': 'export const a = 1;\n' } });
  init(dir, '--agent', 'claude,cursor', '--yes');
  runCli(dir, 'bootstrap', '--here', '--yes');
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
  runCli(dir, 'bootstrap', '--here', '--yes');
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
