// ============================================================
// model → code: has anything a feature declared stopped being true?
//
// Every answer is read from the checkout. This is the half of reconciliation that looks at what
// somebody already wrote down; `coverage.ts` is the half that looks at what they did not.
// ============================================================

import * as fs from 'node:fs';
import * as path from 'node:path';
import { declaresSymbol, findSymbolIn, isCurrentStamp, stampFiles } from './hash';
import { trackedSources } from './sources';
import type { Feature, Model } from '../model/types';

export type StaleKind =
  /** A path in `code:` is not on disk. */
  | 'code_missing'
  /** `entry:` is declared in none of the feature's files. */
  | 'entry_lost'
  /** A path in `tests:` is gone — the evidence, not the code. */
  | 'test_missing'
  /** No stamp, or one written under an older definition. NOTHING is known about freshness. */
  | 'unmeasured'
  /** The stamp no longer matches the files. */
  | 'stale';

export interface StaleItem {
  kind: StaleKind;
  feature: string;
  detail: string;
  /** The path or symbol the finding is about. */
  subject?: string;
  /** Where the entry symbol turned up instead. */
  foundAt?: string;
}

/** Short human label per kind. Every report reads it, so there is one spelling. */
export const STALE_LABEL: Record<StaleKind, string> = {
  code_missing: 'code gone',
  entry_lost: 'entry lost',
  test_missing: 'evidence gone',
  unmeasured: 'not measured',
  stale: 'description older than code',
};

/** Which kinds a re-stamp actually resolves. The rest need a person. */
export const FIXED_BY_SYNC: ReadonlySet<StaleKind> = new Set<StaleKind>(['unmeasured', 'stale']);

export function computeStaleness(repo: string, model: Model): StaleItem[] {
  const items: StaleItem[] = [];
  // One read per file for the whole run: several features routinely claim one file, and each
  // would otherwise re-read and re-normalise the same bytes.
  const cache = new Map<string, string>();
  let candidates: string[] | null = null;

  for (const f of model.features) {
    // ── Evidence, first and unconditionally ──────────────────────────────────
    //
    // ⚠️ This runs BEFORE the code checks and is not swallowed by any branch below: a feature
    // whose files are gone still needs to be told that its evidence is gone too. Folding the two
    // into one branch silences the second exactly when it matters most.
    for (const t of f.tests) {
      if (!fs.existsSync(path.join(repo, t))) {
        items.push({
          kind: 'test_missing', feature: f.name, subject: t,
          detail: `the test claimed as proof is gone: ${t}`,
        });
      }
    }

    const { stamp, missing } = stampFiles(repo, f.code, cache);

    if (missing.length) {
      items.push({
        kind: 'code_missing', feature: f.name, subject: missing[0],
        detail: `${missing.length === 1 ? 'this file is' : `${missing.length} files are`} no longer in the repo: ${missing.join(', ')}`,
      });
      // No stamp can be computed, and none should be: see `stampFiles`. Freshness is unknowable
      // until the file list is corrected, so saying anything about it here would be a guess.
      continue;
    }

    // ── Is the reading entry still where it was declared? ────────────────────
    if (f.entry) {
      const declared = f.code.some((rel) => {
        const src = cache.get(path.join(repo, rel));
        return src !== undefined && declaresSymbol(src, f.entry!);
      });
      if (!declared) {
        candidates ??= trackedSources(repo);
        const found = findSymbolIn(repo, f.entry, candidates.filter((c) => !f.code.includes(c)));
        items.push({
          kind: 'entry_lost', feature: f.name, subject: f.entry, foundAt: found ?? undefined,
          detail: found
            ? `\`${f.entry}\` is declared in none of this feature's files; found in ${found}`
            : `\`${f.entry}\` is declared in none of this feature's files, and nowhere else either`,
        });
      }
    }

    // ── Freshness ────────────────────────────────────────────────────────────
    //
    // A feature with no body is never stamped (see `stamp.ts`), so reporting it as unmeasured
    // here would be a second finding for one state — and the quieter, less actionable of the two.
    // `no_body` already says what is wrong and what to do about it.
    if (!f.lead.trim()) continue;
    if (!f.stamp) {
      items.push({
        kind: 'unmeasured', feature: f.name,
        detail: 'described but never fingerprinted — run `dspec sync --write`',
      });
      continue;
    }
    // ⚠️ A stamp from an older dspec is NOT evidence the code changed; it was taken under a
    // different definition of the input. Reporting it as stale would fill the first report after
    // an upgrade with drift nobody caused.
    if (!isCurrentStamp(f.stamp)) {
      items.push({
        kind: 'unmeasured', feature: f.name,
        detail: 'fingerprinted by an older dspec — re-measure with `dspec sync --write`',
      });
      continue;
    }
    if (stamp && f.stamp !== stamp) {
      items.push({
        kind: 'stale', feature: f.name,
        detail: `the code changed after this was written (${f.code.length === 1 ? f.code[0] : `${f.code.length} files`})`,
      });
    }
  }

  return items;
}

/** The staleness items for one feature — what the pack prints beside it. */
export function stalenessOf(items: StaleItem[], feature: Feature): StaleItem[] {
  return items.filter((i) => i.feature === feature.name);
}
