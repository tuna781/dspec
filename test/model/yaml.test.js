'use strict';
// ============================================================
// The frontmatter parser — and its inverse.
//
// This is a hand-written subset parser, which is only safe while two properties hold:
//
//   1. **Syntax it does not understand THROWS.** A parser that quietly returns `{}` makes a
//      `codeRef` vanish, and an element that is bound but reads as unbound drops out of drift
//      entirely — its `hash` is never checked again. The error is invisible until somebody
//      trusts a clean report.
//   2. **`dumpYaml` is the exact inverse of `parseYaml`.** `dspec sync --write` rewrites frontmatter
//      in files the user owns. A serialiser that drops a key or changes a type eats their words.
// ============================================================
const { test } = require('node:test');
const assert = require('node:assert');
const { parseYaml, dumpYaml, YamlError } = require('../../dist/model/yaml.js');

// ─── What it understands ────────────────────────────────────────────────────

const CASES = [
  ['scalars',            'a: 1\nb: true\nc: null\nd: hi',        { a: 1, b: true, c: null, d: 'hi' }],
  ['versions stay text', 'v: 1.2.3\nd: 2026-01-02',              { v: '1.2.3', d: '2026-01-02' }],
  ['flow sequence',      'xs: [a, b]',                            { xs: ['a', 'b'] }],
  ['block sequence',     'xs:\n  - a\n  - b',                     { xs: ['a', 'b'] }],
  ['nested map',         'cr:\n  file: a.ts\n  symbol: f',        { cr: { file: 'a.ts', symbol: 'f' } }],
  ['colon in value',     'note: see this: really',                { note: 'see this: really' }],
  ['comment stripped',   'a: 1 # trailing',                       { a: 1 }],
  ['hash inside a word', 'a: RFC#6749',                           { a: 'RFC#6749' }],
  ['quoted stays whole', 'a: "x: y"',                             { a: 'x: y' }],
  ['empty value',        'a:',                                    { a: null }],
];

for (const [name, input, expected] of CASES) {
  test(`parses ${name}`, () => {
    assert.deepStrictEqual(parseYaml(input, 'f.md'), expected);
  });
}

test('a sequence of maps: the next key belongs to the SAME item, not a new one', () => {
  // Getting this wrong splits one flow step into two, each missing half its fields — and the
  // model then describes a journey nobody wrote.
  const out = parseYaml('steps:\n  - context: A\n    usecase: x\n  - context: B\n    usecase: y', 'f.md');
  assert.deepStrictEqual(out, {
    steps: [{ context: 'A', usecase: 'x' }, { context: 'B', usecase: 'y' }],
  });
});

// ─── What it refuses ────────────────────────────────────────────────────────

test('unsupported syntax THROWS rather than silently returning empty', () => {
  // The whole safety argument for a hand-written parser rests on this line. Returning `{}` here
  // would make a bound element read as unbound, and it would leave drift for good.
  assert.throws(() => parseYaml('a: >\n  folded block\n', 'f.md'), YamlError);
});

test('the error names the file and the line — without them nobody finds the mistake', () => {
  try {
    parseYaml('ok: 1\nbad: >\n  folded\n', 'contexts/x/usecases/y.md');
    assert.fail('should have thrown');
  } catch (e) {
    assert.ok(e instanceof YamlError);
    assert.match(String(e.message), /y\.md/);
    assert.match(String(e.message), /\b2\b/, `no line number in: ${e.message}`);
  }
}); 

// ─── The inverse ────────────────────────────────────────────────────────────

test('round-trip: dump then parse returns the original values', () => {
  const original = {
    name: 'Place order',
    actors: ['Customer', 'System'],
    codeRef: { file: 'src/a.ts', symbol: 'placeOrder', hash: 'sha256n:abc' },
    facets: { emits: ['OrderCreated'] },
  };
  assert.deepStrictEqual(parseYaml(dumpYaml(original), 'f.md'), original);
});

test('a value whose `#` would open a comment on re-read is quoted', () => {
  // `stripComment` opens a comment at a `#` that starts a line or follows whitespace. An earlier
  // version quoted on `#` FOLLOWED by whitespace — a different set — so `RFC #6749` was written
  // unquoted and the next read truncated it to `RFC`. Half the user's sentence disappeared on
  // every `sync --write`.
  const round = (v) => parseYaml(dumpYaml({ note: v }), 'f.md').note;
  assert.strictEqual(round('RFC #6749 applies'), 'RFC #6749 applies');
  assert.strictEqual(round('#leading'), '#leading');
});

test('dump drops empty keys — `codeRef: {}` must not read as "declared"', () => {
  // `hasCodeRef` treats any filled key as a binding. An emitted empty map would make an unbound
  // element look bound, drag it into drift, and report it as broken forever.
  assert.ok(!/codeRef/.test(dumpYaml({ name: 'x', codeRef: {} })));
});
