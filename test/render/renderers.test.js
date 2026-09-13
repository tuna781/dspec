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

const P = { projectId: 'Shop' };

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

test('a renderer is deterministic — two renders of one model are byte-identical', () => {
  // A timestamp in line 1 dirtied the tree on every write and made every two branches that synced
  // conflict on the same line. Nothing in an artifact may vary except the model.
  assert.deepStrictEqual(renderAll(model(), P), renderAll(model(), P));
  for (const f of renderAll(model(), P)) assert.ok(!/generated=/.test(f.content), `${f.file} carries a timestamp`);
});

test('a hand-written memory file keeps every byte outside the block', () => {
  const { materialise } = require('../../dist/compile/renderers.js');
  const [, claude] = renderAll(model(), P);
  const mine = '# Our team notes\n\nRun `make dev`.\n';
  const once = materialise(claude, mine);
  assert.ok(once.startsWith(mine.trimEnd()), 'what was there is still there, first');
  assert.ok(once.includes(claude.block.trim()));
  // Updating replaces the block in place and nothing else — and doing it twice changes nothing.
  const edited = once.replace('Run `make dev`.', 'Run `make dev` twice.') + '\nTrailing note.\n';
  const again = materialise(claude, edited);
  assert.strictEqual(again, edited);
  const stale = edited.replace(/## Shop — product model \(dspec\)/, '## Old heading');
  assert.strictEqual(materialise(claude, stale), edited);
});

test('a file dspec wrote, or no file at all, gets the whole render', () => {
  const { materialise } = require('../../dist/compile/renderers.js');
  const [, claude] = renderAll(model(), P);
  assert.strictEqual(materialise(claude, null), claude.content);
  assert.strictEqual(materialise(claude, '<!-- ds: project="Shop" -->\n# old\n'), claude.content);
});
