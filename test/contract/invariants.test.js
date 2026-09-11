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
const SURFACES = ['templates/skills/ds/SKILL.md', ...COMMANDS.map((f) => `templates/commands/${f}`)];
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

test('every slash command the skill names exists as a file', () => {
  const skill = read('templates/skills/ds/SKILL.md');
  for (const ph of skill.match(/__DS_CMD_([A-Z]+)__/g) ?? []) {
    const name = ph.replace(/__DS_CMD_|__/g, '').toLowerCase();
    assert.ok(COMMANDS.includes(`${name}.md`), `the skill names /ds-${name}, which has no command file`);
  }
});

test('`/ds-spec` ships with no way to write', () => {
  // It is the one command that must be unable to leave the model describing something that does
  // not exist yet, and a tool list is the only instruction here that is actually enforced.
  const meta = read('templates/commands/spec.md').split('---')[1];
  assert.ok(!/\b(Write|Edit)\b/.test(meta), 'spec.md must not grant a write tool');
});

test('a surface never promises a fence the agent does not have', () => {
  // ⚠️ The reason `__DS_FENCE__` exists. `spec.md` used to say "It has no `Write` or `Edit` tool
  // for that reason" — true in Claude Code, FALSE in Codex and Cursor, neither of which honours a
  // tool list. Claiming a guarantee that is not there is the one thing the product rules forbid
  // outright, so no template may state the mechanism itself.
  for (const rel of SURFACES) {
    const body = read(rel).split('---').slice(2).join('---');
    assert.ok(
      !/has no `?(Write|Edit)`? tool/.test(body),
      `${rel} claims a tool fence in prose — use __DS_FENCE__, which each adapter answers honestly`,
    );
  }
});

test('every agent gets every command, and types it the same way', () => {
  // Four commands, three agents, one spelling. A user who moves between agents must not have to
  // remember which one takes a colon — see the header of `install/agents.ts`.
  const { AGENTS, AGENT_KEYS, COMMAND_NAMES, invoke } = require('../../dist/install/agents.js');
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
        planned.some((f) => f.path.includes(`ds-${name}`)),
        `${key} is not given \`${invoke(name)}\``,
      );
    }
    // A placeholder that survives reaches the user as an instruction to run something that does
    // not exist. This is the assertion the retired plugin build used to make.
    for (const f of planned) {
      assert.ok(!/__DS_/.test(f.content), `${key}: unresolved placeholder in ${f.path}`);
    }
  }
});

test('every command declares a tool list', () => {
  for (const rel of COMMANDS.map((f) => `templates/commands/${f}`)) {
    assert.match(read(rel), /allowed-tools:/, `${rel} has no fence`);
  }
});

test('the hooks only ever add context, and always exit 0', () => {
  const hooks = fs.readdirSync(path.join(ROOT, 'templates/hooks')).filter((f) => f.endsWith('.js'));
  for (const f of hooks) {
    const body = read(`templates/hooks/${f}`);
    assert.ok(!/process\.exit\([1-9]/.test(body), `${f} can fail a tool call`);
    assert.ok(!/"decision"|permissionDecision|"deny"/.test(body), `${f} tries to block`);
  }
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

test('the stop hook only offers sync for what sync can actually fix', () => {
  const { FIXED_BY_SYNC } = require('../../dist/code/staleness.js');
  const body = read('templates/hooks/stop.js');
  for (const kind of FIXED_BY_SYNC) {
    assert.ok(body.includes(`'${kind}'`), `stop.js does not offer sync for \`${kind}\``);
  }
  const { STALE_LABEL } = require('../../dist/code/staleness.js');
  for (const kind of Object.keys(STALE_LABEL)) {
    if (FIXED_BY_SYNC.has(kind)) continue;
    assert.ok(!body.includes(`'${kind}'`), `stop.js offers sync for \`${kind}\`, which sync cannot resolve`);
  }
});
