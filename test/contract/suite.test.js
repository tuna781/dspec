'use strict';
// ============================================================
// The suite checking itself.
//
// ⚠️ `npm test` expands `test/*/*.test.js` in the shell, so a file nested any deeper would simply
// never run — and the suite would stay green by not testing it. That failure is invisible, which
// is exactly the kind this repo refuses to leave unguarded.
// ============================================================
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT } = require('../support/repo');

test('every test file lives exactly one level deep', () => {
  const bad = [];
  const walk = (rel, depth) => {
    for (const e of fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true })) {
      const p = `${rel}/${e.name}`;
      if (e.isDirectory()) walk(p, depth + 1);
      else if (e.name.endsWith('.test.js') && depth !== 1) bad.push(p);
    }
  };
  walk('test', 0);
  assert.deepStrictEqual(bad, [], 'a test at another depth is never run by `npm test`');
});

test('no test imports src/ directly — the suite runs against the build', () => {
  const bad = [];
  const walk = (rel) => {
    for (const e of fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true })) {
      const p = `${rel}/${e.name}`;
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.js') && /require\(['"][^'"]*\/src\//.test(fs.readFileSync(path.join(ROOT, p), 'utf-8'))) bad.push(p);
    }
  };
  walk('test');
  assert.deepStrictEqual(bad, [], 'testing TypeScript source rather than the emitted build tests something users never run');
});
