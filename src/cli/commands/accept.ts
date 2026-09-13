// ============================================================
// `dspec accept "<Feature>"` — a person read both sides, and the description is current
//
// ⚠️ **The one command that clears drift, and it clears only what it is named.** A stamp says
// "this description is true of this code". Re-measuring it is mechanical; asserting it is not —
// somebody has to have read the changed code and the description and decided which was wrong. So
// `sync --write` measures, and never re-stamps a feature whose code moved; this does, by name.
//
// `--all` exists for the case where that reading genuinely happened for everything (a large
// reviewed refactor). It is spelled out so that nobody reaches it by accident.
// ============================================================

import { loadModel } from '../../model/load';
import { findFeature } from '../../model/types';
import { computeStaleness } from '../../code/staleness';
import { plural } from '../../text';
import { parseFlags } from '../args';
import { findRepo } from '../repo';
import { renderArtifacts } from './sync';
import { writeStamps } from './stamp';

const USAGE = `dspec accept "<Feature>" [more features…] [--all]

  Record that a feature's description is current for its code — after reading both. This is
  the only command that clears "description older than code"; \`dspec sync --write\` never does.

  --all   accept every stale feature at once (only after a review of all of them)`;

export function cmdAccept(args: string[]): number {
  const { values, positionals } = parseFlags<{ all?: boolean; help?: boolean }>(args, {
    all: { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
  });
  if (values.help || (!positionals.length && !values.all)) {
    console.log(USAGE);
    return values.help ? 0 : 2;
  }

  const repo = findRepo();
  const { model, sourceOf } = loadModel(repo);

  const names = new Set<string>();
  if (values.all) {
    for (const s of computeStaleness(repo, model)) if (s.kind === 'stale') names.add(s.feature);
  }
  const unknown: string[] = [];
  for (const raw of positionals) {
    const f = findFeature(model, raw);
    if (f) names.add(f.name);
    else unknown.push(raw);
  }
  if (unknown.length) {
    // Exact names only, as `dspec spec` resolves them: accepting a guessed feature would assert
    // freshness for a description nobody read.
    console.error(`✗ no feature named ${unknown.map((u) => `"${u}"`).join(', ')} — see .ds/index.md`);
    return 2;
  }
  if (!names.size) {
    console.log('· nothing is stale — nothing to accept');
    return 0;
  }

  const report = writeStamps(repo, model, sourceOf, true, { acceptDrift: true, only: names });
  // A feature that could not be stamped (a file gone, no body) is reported, not failed: the
  // correction it needs is a `code:` edit or a description, and `dspec sync` names both.
  for (const s of report.skipped) console.log(`! ${s}`);
  if (report.updated.length) {
    renderArtifacts(repo);
    const written = new Set(report.updated);
    const accepted = model.features.filter((f) => written.has(sourceOf.get(f) ?? '')).map((f) => f.name);
    console.log(`✓ accepted ${plural(accepted.length, 'feature')}: ${accepted.join(', ')}`);
  } else if (!report.skipped.length) {
    console.log(`· already current: ${[...names].join(', ')}`);
  }
  return 0;
}
