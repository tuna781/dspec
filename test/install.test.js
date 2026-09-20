'use strict';
// ============================================================
// The install surface — which is, now, the whole of dspec's own behaviour.
//
// Everything this tool does happens in `dspec init`: it writes one command per agent, puts the map
// instructions into the memory file, and takes back exactly what it wrote before. So the suite is
// about two things and nothing else — **what lands where**, and **what dspec is allowed to touch.**
// ============================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { makeRepo, writeIn, readIn, existsIn, runCli, codexPrompt } = require('./support/repo');

const CLAUDE_CMD = '.claude/commands/ds-bootstrap.md';
const CURSOR_CMD = '.agents/skills/ds-bootstrap/SKILL.md';
const MARK = 'dspec:managed';

const init = (dir, ...args) => {
  const r = runCli(dir, 'init', ...args);
  assert.equal(r.status, 0, `init failed:\n${r.stdout}\n${r.stderr}`);
  return r;
};

// ─── what lands where ───────────────────────────────────────────────────────

test('a fresh install puts one command per agent, and the block in its memory file', () => {
  const dir = makeRepo();
  init(dir);

  assert.ok(existsIn(dir, CLAUDE_CMD), 'Claude command');
  assert.ok(existsIn(dir, CURSOR_CMD), 'Cursor skill');
  assert.ok(fs.existsSync(codexPrompt(dir, 'ds-bootstrap.md')), 'Codex prompt');

  for (const f of ['CLAUDE.md', 'AGENTS.md']) {
    const body = readIn(dir, f);
    assert.match(body, /<!-- ds:begin -->/, `${f} opens the block`);
    assert.match(body, /<!-- ds:end -->/, `${f} closes the block`);
    assert.match(body, /\.ds\/index\.md/, `${f} points at the index`);
  }
});

test('the command is the only one installed — the 0.1.x workflow commands are not', () => {
  const dir = makeRepo();
  init(dir);
  assert.deepEqual(fs.readdirSync(path.join(dir, '.claude', 'commands')), ['ds-bootstrap.md']);
  assert.deepEqual(fs.readdirSync(path.join(dir, '.agents', 'skills')), ['ds-bootstrap']);
});

test('every installed file carries the mark, and no placeholder survives into one', () => {
  const dir = makeRepo();
  init(dir);
  for (const p of [path.join(dir, CLAUDE_CMD), path.join(dir, CURSOR_CMD), codexPrompt(dir, 'ds-bootstrap.md')]) {
    const body = fs.readFileSync(p, 'utf-8');
    assert.ok(body.includes(MARK), `${p} carries the mark`);
    assert.doesNotMatch(body, /__DS_/, `${p} has no unsubstituted placeholder`);
  }
});

test('each agent gets the frontmatter it actually reads', () => {
  const dir = makeRepo();
  init(dir);
  // Claude honours a tool list; the other two do not, so giving them one would be a promise
  // nothing keeps.
  assert.match(readIn(dir, CLAUDE_CMD), /^allowed-tools: /m);
  assert.doesNotMatch(readIn(dir, CURSOR_CMD), /allowed-tools/);
  assert.doesNotMatch(fs.readFileSync(codexPrompt(dir, 'ds-bootstrap.md'), 'utf-8'), /allowed-tools/);
  // A Cursor skill is addressed by its name, so the name must be there and must be the command.
  assert.match(readIn(dir, CURSOR_CMD), /^name: ds-bootstrap$/m);
});

test('re-running init is byte-identical', () => {
  const dir = makeRepo();
  init(dir);
  const before = snapshot(dir);
  init(dir);
  assert.deepEqual(snapshot(dir), before);
});

test('a bare init installs every agent, asking nothing', () => {
  const dir = makeRepo();
  // ⚠️ stdin is not a TTY under the test runner, which is exactly the case the old picker
  // treated as "nobody to ask" and refused. There is nothing to ask now.
  init(dir);
  assert.ok(existsIn(dir, CLAUDE_CMD), 'Claude');
  assert.ok(existsIn(dir, CURSOR_CMD), 'Cursor');
  assert.ok(fs.existsSync(codexPrompt(dir, 'ds-bootstrap.md')), 'Codex');
  assert.ok(existsIn(dir, 'CLAUDE.md') && existsIn(dir, 'AGENTS.md'), 'both memory files');
});

test('the removed picker flags are errors, not silently ignored', () => {
  const dir = makeRepo();
  for (const gone of ['--all', '--yes']) {
    const r = runCli(dir, 'init', gone);
    assert.notEqual(r.status, 0, `${gone} is gone`);
  }
});

// ─── what dspec is allowed to touch ─────────────────────────────────────────

test('a hand-written memory file keeps every byte and gains the block', () => {
  const dir = makeRepo({ files: { 'CLAUDE.md': '# My project\n\nRun `make test` before pushing.\n' } });
  init(dir, '--agent', 'claude');
  const body = readIn(dir, 'CLAUDE.md');
  assert.match(body, /# My project/);
  assert.match(body, /Run `make test` before pushing\./);
  assert.match(body, /<!-- ds:begin -->/);
});

test('a second run replaces only what is between the markers', () => {
  const dir = makeRepo({ files: { 'CLAUDE.md': '# Mine\n' } });
  init(dir, '--agent', 'claude');
  writeIn(dir, 'CLAUDE.md', readIn(dir, 'CLAUDE.md') + '\n## Afterword\n\nStill mine.\n');
  init(dir);
  const body = readIn(dir, 'CLAUDE.md');
  assert.match(body, /# Mine/);
  assert.match(body, /## Afterword/);
  assert.match(body, /Still mine\./);
  assert.equal(body.match(/<!-- ds:begin -->/g).length, 1, 'exactly one block');
});

test('a file named like ours but without the mark is never removed', () => {
  const dir = makeRepo({ files: { '.claude/commands/ds-deploy.md': 'my own command\n' } });
  init(dir, '--agent', 'claude');
  assert.equal(readIn(dir, '.claude/commands/ds-deploy.md'), 'my own command\n');
});

test('not choosing Codex does not uninstall it from the home directory', () => {
  const dir = makeRepo();
  init(dir);
  init(dir, '--agent', 'claude');
  assert.ok(fs.existsSync(codexPrompt(dir, 'ds-bootstrap.md')), 'Codex prompt survives');
});

test('choosing an agent again after dropping another leaves the dropped one removed', () => {
  const dir = makeRepo();
  init(dir);
  init(dir, '--agent', 'claude');
  assert.equal(existsIn(dir, CURSOR_CMD), false, 'Cursor was removed — it lives in the repo');
  assert.ok(existsIn(dir, CLAUDE_CMD));
});

// ─── upgrading from 0.1.x ───────────────────────────────────────────────────

/** A repo as dspec 0.1.x left it: three commands, a hook directory, hook entries, a whole CLAUDE.md. */
function seedLegacy(dir) {
  const marked = (body) => `${body}\n<!-- ${MARK} -->\n`;
  writeIn(dir, '.claude/commands/ds.md', marked('---\ndescription: spec and build\n---\n\nRun `dspec spec`.'));
  writeIn(dir, '.claude/commands/ds-bootstrap.md', marked('---\ndescription: old bootstrap\n---\n\nRun `dspec sync --write`.'));
  writeIn(dir, '.claude/commands/ds-update.md', marked('---\ndescription: update\n---\n\nRun `dspec update`.'));
  writeIn(dir, '.claude/hooks/dspec/stop.js', "require('./_ds')\n");
  writeIn(dir, '.claude/hooks/dspec/_ds.js', 'module.exports = {}\n');
  writeIn(dir, '.claude/settings.json', JSON.stringify({
    permissions: { allow: ['Bash(npm test)'] },
    hooks: {
      SessionStart: [{ hooks: [{ type: 'command', command: 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/dspec/session-start.js"', timeout: 15 }] }],
      Stop: [{ hooks: [{ type: 'command', command: 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/dspec/stop.js"', timeout: 10 }] }],
    },
  }, null, 2) + '\n');
  writeIn(dir, 'CLAUDE.md', '<!-- ds: project="shop" -->\n# shop\n\nGenerated in full by the old version.\n');
  writeIn(dir, '.ds/config.json', '{"cli":"/somewhere/ds.js"}\n');
}

test('upgrading removes the workflow commands and the hook scripts', () => {
  const dir = makeRepo();
  seedLegacy(dir);
  init(dir);

  assert.deepEqual(fs.readdirSync(path.join(dir, '.claude', 'commands')), ['ds-bootstrap.md']);
  assert.equal(existsIn(dir, '.claude/hooks/dspec'), false, 'the hook directory is gone');
  // ⚠️ The rebuilt command must be THIS version's, not the one that was already sitting there
  // under the same name.
  assert.match(readIn(dir, CLAUDE_CMD), /Map this codebase into `\.ds\/`/);
});

test('upgrading takes back the hook entries the old version added, and nothing else', () => {
  const dir = makeRepo();
  seedLegacy(dir);
  init(dir);

  const settings = JSON.parse(readIn(dir, '.claude/settings.json'));
  // The whole `hooks` key goes, because dspec's entries were all of it. A block emptied by our
  // own removal is not left behind as an empty shell.
  assert.equal('hooks' in settings, false, "dspec's entries are gone, and so is the empty block");
  assert.deepEqual(settings.permissions, { allow: ['Bash(npm test)'] }, 'everything else is kept');
});

test("a user's own hooks are left exactly as they were", () => {
  const dir = makeRepo();
  const mine = JSON.stringify({
    hooks: { Stop: [{ hooks: [{ type: 'command', command: 'node ./my-hook.js' }] }] },
  }, null, 2) + '\n';
  writeIn(dir, '.claude/settings.json', mine);
  init(dir, '--agent', 'claude');
  assert.equal(readIn(dir, '.claude/settings.json'), mine, 'byte-identical');
});

test('a settings.json holding nothing of ours is not even reformatted', () => {
  const dir = makeRepo();
  const theirs = '{\n    "permissions": {"allow": []}\n}\n'; // four-space, compact inner object
  writeIn(dir, '.claude/settings.json', theirs);
  init(dir, '--agent', 'claude');
  assert.equal(readIn(dir, '.claude/settings.json'), theirs);
});

test('a settings.json that does not parse is reported and never written', () => {
  const dir = makeRepo();
  writeIn(dir, '.claude/settings.json', '{ "hooks": , }\n');
  const r = init(dir, '--agent', 'claude');
  assert.equal(readIn(dir, '.claude/settings.json'), '{ "hooks": , }\n');
  assert.match(r.stdout, /could not be parsed/);
  assert.ok(existsIn(dir, CLAUDE_CMD), 'the install still went through');
});

test('a CLAUDE.md the old version generated in full is replaced, not appended to', () => {
  const dir = makeRepo();
  seedLegacy(dir);
  init(dir);
  const body = readIn(dir, 'CLAUDE.md');
  assert.doesNotMatch(body, /Generated in full by the old version/);
  assert.doesNotMatch(body, /<!-- ds: project=/, 'the old stamp is gone');
  assert.match(body, /<!-- ds:begin -->/);
});

test('init never creates .ds/ — reading the codebase is the agent\'s job', () => {
  const dir = makeRepo();
  init(dir);
  assert.equal(existsIn(dir, '.ds'), false);
});

// ─── the command surface ────────────────────────────────────────────────────

test('init is the only verb, and an unknown one is an error', () => {
  const dir = makeRepo();
  for (const gone of ['sync', 'spec', 'accept', 'update']) {
    const r = runCli(dir, gone);
    assert.equal(r.status, 2, `${gone} is gone`);
    assert.match(r.stderr, /no such command/);
  }
});

test('--version prints a version and --help the usage', () => {
  const dir = makeRepo();
  assert.match(runCli(dir, '--version').stdout.trim(), /^\d+\.\d+\.\d+/);
  assert.match(runCli(dir, '--help').stdout, /dspec init/);
});

test('a mistyped flag is an error, never a silent pass', () => {
  const dir = makeRepo();
  const r = runCli(dir, 'init', '--agnet', 'claude');
  assert.notEqual(r.status, 0);
});

// ─── helpers ────────────────────────────────────────────────────────────────

/** Every file dspec could have written, as path → content. */
function snapshot(dir) {
  const out = {};
  const walk = (abs, rel) => {
    for (const name of fs.readdirSync(abs).sort()) {
      if (name === '.git') continue;
      const p = path.join(abs, name);
      const r = rel ? `${rel}/${name}` : name;
      if (fs.statSync(p).isDirectory()) walk(p, r);
      else out[r] = fs.readFileSync(p, 'utf-8');
    }
  };
  walk(dir, '');
  return out;
}
