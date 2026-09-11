// ============================================================
// "What does this project still owe?" — **derived, never stored**
//
// ⚠️ **No file may be added to answer this question.** Everything is already here: git says which
// descriptions changed without being committed, the staleness walk says where the code disagrees,
// the linter says which are thin, coverage says what nothing describes, and a re-render says
// whether an artifact has fallen behind. A `todo.md` would be a SECOND source of truth for
// something already known — it starts synchronised, then drifts, and then people trust it instead
// of the model.
// ============================================================

import { changedModelFiles } from '../git/rev';
import { computeCoverage } from '../code/coverage';
import { computeStaleness, FIXED_BY_SYNC, STALE_LABEL } from '../code/staleness';
import { checkArtifacts } from './artifacts';
import { lintModel } from './lint';
import { SPEC_DIR } from '../model/load';
import { plural } from '../text';
import type { Model } from '../model/types';

export interface WorkItem {
  kind: 'handover' | 'stale' | 'quality' | 'coverage' | 'artifact';
  title: string;
  detail?: string;
  /** The command that resolves it. Absent when only a person can. */
  next?: string;
}

export interface WorkOptions {
  /** Skip the checkout walk — it reads real source and is the slowest part of the answer. */
  skipCode?: boolean;
}

export function buildWorkList(repo: string, model: Model, opts: WorkOptions = {}): WorkItem[] {
  const items: WorkItem[] = [];

  const changed = changedModelFiles(repo, SPEC_DIR);
  if (changed.length) {
    // ⚠️ **No `next` here, deliberately.** The loop is code-first: `.ds/` is written after the
    // code exists, so an uncommitted description is normally work that is already done, not work
    // that is owed. Pointing anywhere would send the reader to redo something finished.
    items.push({
      kind: 'handover',
      title: `${plural(changed.length, 'model file')} changed but not committed`,
      detail: changed.slice(0, 5).join(', ') + (changed.length > 5 ? ` +${changed.length - 5}` : ''),
    });
  }

  if (!opts.skipCode) {
    for (const s of computeStaleness(repo, model)) {
      items.push({
        kind: 'stale',
        title: `[${STALE_LABEL[s.kind]}] ${s.feature}`,
        detail: s.detail,
        next: FIXED_BY_SYNC.has(s.kind) ? 'dspec sync --write' : undefined,
      });
    }
  }

  // Quality: only the rule that means "an agent will have to guess here". Dumping every finding
  // into the work list would drown the three lines worth reading; the full
  // list belongs in the report `dspec sync` prints under it.
  for (const f of lintModel(model)) {
    if (f.code !== 'no_body') continue;
    items.push({ kind: 'quality', title: `no description: ${f.feature}`, detail: f.detail });
  }

  if (!opts.skipCode) {
    const coverage = computeCoverage(repo, model);
    if (coverage.unclaimed) {
      items.push({
        kind: 'coverage',
        title: `${plural(coverage.unclaimed, 'source file')} no feature describes`,
        detail: coverage.dirs.slice(0, 3).map((d) => `${d.dir} ${d.unclaimed}/${d.total}`).join(', '),
      });
    }
  }

  // ⚠️ Through `checkArtifacts`, so this and `sync --strict` cannot disagree — and so every rendered
  // format is covered rather than only the one somebody remembered.
  for (const a of checkArtifacts(repo, model).stale) {
    items.push({ kind: 'artifact', title: `${a.path} ${a.detail}`, next: 'dspec sync --write' });
  }

  return items;
}
