'use strict';
// ============================================================
// The two artifacts.
//
// ⚠️ **The output IS the product.** `.ds/index.md` is the entry point every agent reads first, and
// `CLAUDE.md` is billed on every turn. A surplus line here is tokens every user pays forever, so
// this file asserts shape rather than snapshotting prose — a snapshot people update reflexively
// stops being a decision.
// ============================================================
const { test } = require('node:test');
const assert = require('node:assert');
const { renderIndex, renderMemoryFile, renderAll, parseArtifactStamp } = require('../../dist/compile/renderers.js');
const { model, feature } = require('../fixtures/complete-model.js');

const P = { projectId: 'Shop', generatedAt: '2026-01-01T00:00:00.000Z' };

test('the index answers what and where for every feature', () => {
  const { content } = renderIndex(model(), P);
  assert.match(content, /## Checkout/);
  assert.match(content, /\*\*Place order\*\* — Turns a cart into an order and takes the money/);
  assert.match(content, /`src\/order\/place\.ts`/);
  assert.match(content, /uses: Apply discount/);
});

test('areas are ordered alphabetically, so a rename does not move headings', () => {
  const m = model({ features: [
    feature({ name: 'Z', area: 'Zulu' }),
    feature({ name: 'A', area: 'Alpha' }),
  ] });
  const { content } = renderIndex(m, P);
  assert.ok(content.indexOf('## Alpha') < content.indexOf('## Zulu'));
});

test('an empty model says so rather than rendering a blank page', () => {
  const { content } = renderIndex(model({ features: [] }), P);
  assert.match(content, /No features described yet/);
});

test('a memory file is a POINTER, not a copy of the model', () => {
  const { content } = renderMemoryFile(model(), P, 'CLAUDE.md', false);
  assert.match(content, /\.ds\/index\.md/);
  assert.match(content, /- Money is always minor units/, 'the product rules apply to every change');
  assert.ok(!content.includes('src/order/place.ts'), 'a per-feature detail here is billed on every turn');
  assert.ok(!content.includes('Refuses an empty cart'), 'bodies belong in the feature file');
});

test('a memory file stays small as the model grows', () => {
  const many = model({ features: Array.from({ length: 200 }, (_, i) => feature({ name: `F${i}` })) });
  assert.ok(renderMemoryFile(many, P, 'CLAUDE.md', false).content.length < 2000,
    'a pointer must not grow with the model');
});

test('only the file with no hook behind it asks the agent to brief itself', () => {
  // ⚠️ Claude Code runs a SessionStart hook that does this already; Codex and Cursor cannot run a
  // command on a session event at all. A paragraph telling Claude to do what the hook just did is
  // noise billed on every turn, and leaving it OUT of `AGENTS.md` would leave those two agents
  // opening a session knowing nothing.
  const withHook = renderMemoryFile(model(), P, 'CLAUDE.md', false).content;
  const without = renderMemoryFile(model(), P, 'AGENTS.md', true).content;
  assert.ok(!/At the start of a session/.test(withHook));
  assert.match(without, /At the start of a session/);
  assert.match(without, /cannot\n?\s*run a command on a session event/,
    'it must say WHY, or it reads as a nag rather than a substitute for a missing hook');
});

test('renderAll produces one memory file per agent family it is given', () => {
  const files = renderAll(model(), P, ['CLAUDE.md', 'AGENTS.md']).map((f) => f.file);
  assert.deepStrictEqual(files, ['.ds/index.md', 'CLAUDE.md', 'AGENTS.md']);
  // The default is what every model written before adapters already had, so an old checkout
  // renders exactly what it always did.
  assert.deepStrictEqual(renderAll(model(), P).map((f) => f.file), ['.ds/index.md', 'CLAUDE.md']);
});

test('every artifact is stamped, and the stamp names the project', () => {
  for (const f of renderAll(model(), P)) {
    const parsed = parseArtifactStamp(f.content);
    assert.strictEqual(parsed && parsed.projectId, 'Shop', `${f.file} carries no readable stamp`);
  }
});

test('a renderer is pure — the timestamp is the only thing that varies', () => {
  const a = renderAll(model(), P);
  const b = renderAll(model(), { ...P, generatedAt: '2030-06-06T00:00:00.000Z' });
  for (let i = 0; i < a.length; i++) {
    assert.strictEqual(
      a[i].content.replace(/generated=\S*/, ''),
      b[i].content.replace(/generated=\S*/, ''),
    );
  }
});
