'use strict';
// ============================================================
// The six rules.
//
// What this defends is the principle that chose them: **a rule exists for a failure that HIDES.**
// A typo in `uses:` silently costs an edge; a typo in `area:` costs a heading you see immediately.
// Adding a rule for the second kind is how a linter becomes noise people learn to skip.
// ============================================================
const { test } = require('node:test');
const assert = require('node:assert');
const { lintModel, lintRepo, LINT_RULE_CODES, SEVERITY } = require('../../dist/compile/lint.js');
const { model, feature } = require('../fixtures/complete-model.js');
const { makeRepo } = require('../support/repo');

const codes = (findings) => findings.map((f) => f.code).sort();

test('a clean model reports nothing', () => {
  assert.deepStrictEqual(lintModel(model()), []);
});

test('a `uses` that resolves to nothing is an ERROR — it silently costs an edge', () => {
  const m = model({ features: [feature({ uses: ['No such feature'] })] });
  const [f] = lintModel(m);
  assert.strictEqual(f.code, 'unresolved_use');
  assert.strictEqual(f.severity, 'error');
  assert.strictEqual(f.subject, 'No such feature');
});

test('`uses` resolves case- and space-insensitively', () => {
  const m = model();
  m.features[0].uses = ['apply   DISCOUNT'];
  assert.deepStrictEqual(lintModel(m), []);
});

test('two features sharing a name are reported once, not twice', () => {
  const m = model({ features: [feature(), feature({ name: 'place ORDER' })] });
  const found = lintModel(m).filter((f) => f.code === 'duplicate_name');
  assert.strictEqual(found.length, 1, 'one problem, one finding');
  assert.match(found[0].detail, /2 features/);
});

test('a feature with no lead paragraph warns, and does not fail', () => {
  const m = model({ features: [feature({ lead: '', body: '' })] });
  const [f] = lintModel(m).filter((x) => x.code === 'no_body');
  assert.strictEqual(f.severity, 'warn');
});

test('a feature declaring no code describes nothing that exists', () => {
  const m = model({ features: [feature({ code: [] })] });
  assert.ok(codes(lintModel(m)).includes('missing_code'));
});

test('an area typo has no rule — it is visible in the index', () => {
  const m = model({ features: [feature({ area: 'Chekout' })] });
  assert.deepStrictEqual(lintModel(m), [], 'checking what already shows is how a linter becomes noise');
});

test('a `code` path that is not on disk is an error, and unclaimed code only info', () => {
  const dir = makeRepo({ files: { 'src/real.ts': 'export const a = 1;\n' }, git: 'committed' });
  const m = model({ features: [feature({ code: ['src/gone.ts'] })] });
  const found = lintRepo(dir, m);
  assert.strictEqual(found.find((f) => f.code === 'missing_code').severity, 'error');
  assert.strictEqual(found.find((f) => f.code === 'unclaimed_code').severity, 'info');
});

test('every declared rule code has a severity', () => {
  for (const code of LINT_RULE_CODES) assert.ok(SEVERITY[code], `${code} has no severity`);
  assert.strictEqual(LINT_RULE_CODES.length, 6, 'adding a rule is a decision — update the docs with it');
});
