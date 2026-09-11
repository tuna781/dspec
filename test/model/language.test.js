'use strict';
// ============================================================
// The vocabulary has exactly one source.
//
// ⚠️ This is the test that keeps the promise `language.ts` was written to make. The label
// set was hand-written in seven places; six could drift, and a user who read a drifted copy was
// penalised for following the documentation. Every surface that teaches the language must be
// GENERATED, so this file fails any that spells it out instead.
// ============================================================
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const {
  FEATURE_KEYS, KEYS, BODY_LABELS, LABELS, renderLanguageBlock, exampleFeature, labelLine,
} = require('../../dist/model/language.js');
const { parseBody } = require('../../dist/model/sections.js');
const { ROOT } = require('../support/repo');

test('the declarations agree with each other', () => {
  assert.deepStrictEqual(KEYS.map((k) => k.name), [...FEATURE_KEYS], 'every key needs a gloss, in order');
  assert.deepStrictEqual(LABELS.map((l) => l.name), [...BODY_LABELS]);
  assert.deepStrictEqual(
    KEYS.filter((k) => k.writer === 'cli').map((k) => k.name),
    ['stamp'],
    'the CLI writes exactly one field — adding another is a decision, not a detail',
  );
});

test('the worked example parses as the language it documents', () => {
  const src = exampleFeature();
  const body = src.slice(src.lastIndexOf('---') + 3);
  const parsed = parseBody(body);
  assert.ok(parsed.lead.trim(), 'the example must show a lead paragraph');
  for (const label of BODY_LABELS) {
    assert.ok(parsed.sections.get(label)?.length, `the example must demonstrate ${label}`);
  }
});

test('every label appears in the rendered block', () => {
  const full = renderLanguageBlock('full');
  for (const l of BODY_LABELS) assert.ok(full.includes(l), `${l} missing from the full block`);
  for (const k of FEATURE_KEYS) assert.ok(full.includes(`\`${k}\``), `${k} missing from the full block`);
  assert.ok(renderLanguageBlock('line').includes(labelLine()));
});

// ─── The guard ──────────────────────────────────────────────────────────────

/** Every surface that teaches the language and must therefore generate it. */
const SURFACES = [
  'templates/skills/ds/SKILL.md',
  ...fs.readdirSync(path.join(ROOT, 'templates/commands')).map((f) => `templates/commands/${f}`),
];

test('no surface hand-writes the vocabulary', () => {
  const offenders = [];
  for (const rel of SURFACES) {
    const body = fs.readFileSync(path.join(ROOT, rel), 'utf-8');
    for (const line of body.split('\n')) {
      if (line.includes('__DS_LANG_')) continue;
      // Two or more labels on one line is a copy of the vocabulary, not a mention of one label.
      if (BODY_LABELS.filter((l) => line.includes(l)).length >= 2) offenders.push(`${rel}: ${line.trim()}`);
      // The required keys are the other half of the vocabulary, and drift the same way.
      const keys = KEYS.filter((k) => k.required).filter((k) => line.includes(`\`${k.name}\``));
      if (keys.length >= 2) offenders.push(`${rel}: ${line.trim()}`);
    }
  }
  assert.deepStrictEqual(offenders, [], 'use a __DS_LANG_*__ placeholder instead');
});
