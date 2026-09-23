#!/usr/bin/env node
// Summarise a results directory: per task and condition, the rubric score, time, context tokens and cost.
//   node report.js results/<timestamp>
const fs = require('fs');
const path = require('path');

const dir = process.argv[2];
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const cells = {};

for (const f of fs.readdirSync(dir).filter((f) => /^[^.]+\.(with|without)\.\d+\.json$/.test(f))) {
  const [task, cond] = f.split('.');
  const run = read(path.join(dir, f));
  const grade = read(path.join(dir, f.replace(/\.json$/, '.grade.json')));
  let score = null;
  try { score = JSON.parse(grade.result.match(/\{[^]*\}/)[0]).score; } catch {}
  const cell = (cells[`${task}|${cond}`] ??= { task, cond, scores: [], secs: [], tokens: [], cost: [] });
  cell.scores.push(score);
  if (run) {
    const u = run.usage ?? {};
    cell.secs.push(run.duration_ms / 1000);
    cell.tokens.push((u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0));
    cell.cost.push(run.total_cost_usd);
  }
}

const mean = (xs) => { const v = xs.filter((x) => typeof x === 'number'); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN; };
console.log('| task | map | scores (0–2) | mean score | mean time | mean context tokens | mean cost |');
console.log('|---|---|---|---|---|---|---|');
for (const c of Object.values(cells).sort((a, b) => a.task.localeCompare(b.task) || b.cond.localeCompare(a.cond))) {
  console.log(`| ${c.task} | ${c.cond} | ${c.scores.map((s) => s ?? '?').join(' ')} | ${mean(c.scores).toFixed(2)} | ${mean(c.secs).toFixed(0)}s | ${Math.round(mean(c.tokens)).toLocaleString('en-US')} | $${mean(c.cost).toFixed(2)} |`);
}
