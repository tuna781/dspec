'use strict';
// ============================================================
// The agent-facing surfaces.
//
// These files ARE the product: they are the only thing that turns a measurement into behaviour.
// Every rule here exists because a surface that drifts from the machine teaches an agent something
// the machine then penalises.
// ============================================================
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT } = require('../support/repo');

const COMMANDS = fs.readdirSync(path.join(ROOT, 'templates/commands'));
const SURFACES = COMMANDS.map((f) => `templates/commands/${f}`);
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

test('placeholders are the only way a surface names another command', () => {
  // A hard-coded `/ds-sync` in a template is a second spelling that goes stale on its own. The
  // adapters resolve the placeholder, so three agents cannot end up disagreeing about how a
  // command is typed.
  for (const rel of SURFACES) {
    const body = read(rel).split('---').slice(2).join('---');
    assert.deepStrictEqual(body.match(/\/ds[:-][a-z]+/g) ?? [], [], `${rel} hard-codes a command name`);
  }
});

test('no surface mentions a command the CLI does not have', () => {
  const { VERBS } = require('../../dist/cli/index.js');
  for (const rel of SURFACES) {
    // Only inside a code span: an agent reads `dspec sync` as a command line to type, and prose
    // like "a dspec model" is English, not an invocation. Matching bare words made this fail on
    // the skill's own title.
    for (const verb of read(rel).match(/`dspec ([a-z]+)/g) ?? []) {
      const name = verb.slice(7);
      assert.ok(VERBS.includes(name), `${rel} calls \`${verb}\`, which is not a command`);
    }
  }
});

test('nothing keeps its own copy of the verb list', () => {
  // ⚠️ This is the test that was missing. Two hand-kept allow-lists — the plugin build's and the
  // hook helper's — went on retargeting `ds compile` and `ds map` for two rounds after those
  // commands were deleted. Rewriting a verb the CLI does not have tells the agent to run something
  // that fails, so both lists are now derived from `VERBS` and this fails if either is retyped.
  for (const rel of ['templates/hooks/_ds.js']) {
    const body = read(rel);
    assert.ok(/VERBS/.test(body), `${rel} does not read the verb set from the CLI`);
    const inline = body.match(/\\bds \(([a-z|]+)\)\\b/);
    assert.strictEqual(inline, null, `${rel} hard-codes a verb list: ${inline && inline[1]}`);
  }
});

test('the session has exactly three commands, and no skill', () => {
  // ⚠️ In Claude Code and Cursor a skill is ALSO a slash command. A fourth name in the menu is the
  // surface this product was cut down to avoid, so nothing but the three commands is installed.
  assert.deepStrictEqual(COMMANDS.sort(), ['bootstrap.md', 'ds.md', 'update.md']);
  assert.ok(!fs.existsSync(path.join(ROOT, 'templates/skills')), 'a skill would be a fourth command');
  const { AGENTS, AGENT_KEYS } = require('../../dist/install/agents.js');
  for (const key of AGENT_KEYS) {
    const planned = AGENTS[key].plan({ repo: ROOT, templates: path.join(ROOT, 'templates') });
    assert.ok(!planned.some((f) => /\/skills\/(?!ds(-bootstrap|-update)?\/)/.test(f.path)), `${key} is given a skill`);
  }
});

test('/ds builds nothing before the user approves the plan', () => {
  const body = read('templates/commands/ds.md');
  assert.match(body, /Nothing is written — no code, no model — until the user approves/);
  assert.match(body, /Stop and wait for the user's decision/);
});

test('a surface never promises a fence the agent does not have', () => {
  // ⚠️ `spec.md` once said "It has no `Write` or `Edit` tool for that reason" — true in Claude
  // Code, FALSE in Codex and Cursor, neither of which honours a tool list. No template may state
  // the mechanism as a guarantee.
  for (const rel of SURFACES) {
    const body = read(rel).split('---').slice(2).join('---');
    assert.ok(!/has no `?(Write|Edit)`? tool/.test(body), `${rel} claims a tool fence in prose`);
  }
});

test('no document names the model\'s format', () => {
  // The model is internal. What an agent needs to write it comes from `dspec sync --guide`; no
  // README, changelog, installed command or rendered memory file teaches or names the format.
  const { execFileSync } = require('node:child_process');
  let hits = '';
  try {
    hits = execFileSync('git', ['grep', '-n', '-i', 'dspec' + '-lang', '--', '.'], { cwd: ROOT, encoding: 'utf-8' });
  } catch { /* git grep exits 1 when nothing matches */ }
  assert.strictEqual(hits, '', `the format is named in:\n${hits}`);
});

test('every agent gets every command, and types it the same way', () => {
  // Three commands, three agents, one spelling. A user who moves between agents must not have to
  // remember which one takes a colon — see the header of `install/agents.ts`.
  const { AGENTS, AGENT_KEYS, COMMAND_NAMES, invoke, installedName, MANAGED_MARK } = require('../../dist/install/agents.js');
  const templates = path.join(ROOT, 'templates');
  assert.deepStrictEqual(
    [...COMMAND_NAMES].sort(),
    COMMANDS.map((f) => f.replace(/\.md$/, '')).sort(),
    'the adapters and `templates/commands/` disagree about which commands exist',
  );
  for (const key of AGENT_KEYS) {
    const planned = AGENTS[key].plan({ repo: ROOT, templates });
    for (const name of COMMAND_NAMES) {
      assert.ok(
        planned.some((f) => path.basename(f.path, '.md') === installedName(name) || f.path.includes(`/${installedName(name)}/`)),
        `${key} is not given \`${invoke(name)}\``,
      );
    }
    // A placeholder that survives reaches the user as an instruction to run something that does
    // not exist. This is the assertion the retired plugin build used to make.
    for (const f of planned) {
      assert.ok(!/__DS_/.test(f.content), `${key}: unresolved placeholder in ${f.path}`);
      // The mark is what `dspec init` deletes by. A file without it would never be rebuilt.
      assert.ok(f.content.includes(MANAGED_MARK), `${key}: ${f.path} carries no ${MANAGED_MARK} mark`);
    }
  }
});

test('every command declares a tool list', () => {
  for (const rel of COMMANDS.map((f) => `templates/commands/${f}`)) {
    assert.match(read(rel), /allowed-tools:/, `${rel} has no fence`);
  }
});

test('the hooks never block the user or a tool call, and always exit 0', () => {
  const hooks = fs.readdirSync(path.join(ROOT, 'templates/hooks')).filter((f) => f.endsWith('.js'));
  for (const f of hooks) {
    const body = read(`templates/hooks/${f}`);
    assert.ok(!/process\.exit\([1-9]/.test(body), `${f} can fail a tool call`);
    assert.ok(!/permissionDecision|"deny"/.test(body), `${f} tries to block a tool call`);
  }
  // Only the Stop hook may keep the AGENT working, and only behind the loop guard.
  for (const f of hooks.filter((h) => h !== 'stop.js' && h !== '_ds.js')) {
    assert.ok(!/emitContinue/.test(read(`templates/hooks/${f}`)), `${f} holds the agent — only stop.js may`);
  }
  assert.match(read('templates/hooks/stop.js'), /stop_hook_active/, 'the Stop hook must never loop');
});

test('every file in templates/hooks is one an agent is actually given', () => {
  // ⚠️ A `hooks.json` survived the plugin's retirement here: dead, uninstalled, and still
  // declaring hook commands through a `${CLAUDE_PLUGIN_ROOT}` that no longer exists anywhere.
  // A second declaration of the wiring is exactly the drift this project exists to prevent —
  // the next reader would have taken it for the source of truth instead of `claudeHooksBlock()`.
  const { AGENTS } = require('../../dist/install/agents.js');
  const installed = new Set(
    AGENTS.claude.plan({ repo: ROOT, templates: path.join(ROOT, 'templates') })
      .filter((f) => f.path.startsWith('.claude/hooks/'))
      .map((f) => path.basename(f.path)),
  );
  for (const f of fs.readdirSync(path.join(ROOT, 'templates/hooks'))) {
    assert.ok(installed.has(f), `templates/hooks/${f} is installed by nobody — delete it or install it`);
  }
});

test('a hook never reaches dspec through a relative path', () => {
  // ⚠️ The hooks are COPIED into the user's `.claude/hooks/`, so `../dist/` resolves to
  // `.claude/dist/`, which does not exist. And the failure is silent by design: a hook that
  // throws is caught and exits 0, so the user sees a hook that has quietly stopped working
  // rather than an error. `dspecModule` is the only way in.
  for (const f of fs.readdirSync(path.join(ROOT, 'templates/hooks')).filter((n) => n.endsWith('.js'))) {
    const body = read(`templates/hooks/${f}`);
    assert.ok(
      !/require\(path\.join\(__dirname/.test(body),
      `${f} requires dspec relative to itself — use dspecModule(), or it goes silent once installed`,
    );
  }
});

test('a hook uses no binding it has not imported', () => {
  // The same silent-failure class, one step earlier: a stray `path.join` after the `require` for
  // it was dropped throws a ReferenceError, which the catch swallows into exit 0.
  for (const f of fs.readdirSync(path.join(ROOT, 'templates/hooks')).filter((n) => n.endsWith('.js'))) {
    const body = read(`templates/hooks/${f}`);
    const code = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    for (const mod of ['path', 'fs']) {
      if (!new RegExp(`\\b${mod}\\.`).test(code)) continue;
      assert.match(code, new RegExp(`require\\('node:${mod}'\\)`), `${f} uses \`${mod}.\` without requiring it`);
    }
  }
});

test('the stop hook holds the agent only for work the model owes', () => {
  // Drift, lost code, a feature with no description, new code nobody claims, an artifact behind.
  // "Not measured" is `sync --write`'s to fix mechanically, and is not a reason to keep the agent.
  const body = read('templates/hooks/stop.js');
  for (const kind of ['stale', 'code_missing', 'entry_lost']) assert.ok(body.includes(`'${kind}'`), `stop.js ignores ${kind}`);
  assert.ok(!body.includes(`'unmeasured'`), 'stop.js holds the agent for something sync --write fixes');
  assert.match(body, /changedUnclaimed/);
});
