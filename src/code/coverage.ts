// ============================================================
// code → model: what does no feature describe?
//
// Staleness walks the model and asks whether the code it names still matches. That only ever finds
// problems in things somebody already wrote down, so it is structurally blind to the failure this
// product exists to prevent: a feature shipped that the model never mentions. This module asks the
// mirror question, and the two together are what make `dspec sync` a reconciliation rather than a
// one-way check.
//
// ⚠️ **It counts FILES, not symbols.** Asking per declaration answers with
// hundreds of private helpers — a number nobody could act on, so nobody read it. A repository has
// tens of source files, and "no feature describes `src/git/rev.ts`" is a question a person can
// actually answer.
//
// ⚠️ **It observes; it never concludes.** Not every file deserves a feature. Which ones do is a
// judgement, and this module makes none: it lists, and says so.
// ============================================================

import { claims, type Model } from '../model/types';
import { trackedSources } from './sources';

/** Unclaimed files listed per directory before the rest collapse into a count. */
export const DIR_LISTING_CAP = 8;

export interface CoverageDir {
  /** The directory, repo-relative — an observed fact, never an area name. */
  dir: string;
  /** Unclaimed files, capped at `DIR_LISTING_CAP` for display. */
  shown: string[];
  /** How many unclaimed files this directory really has. Always exact. */
  unclaimed: number;
  /** Every source file in the directory, claimed or not — the denominator. */
  total: number;
}

export interface Coverage {
  /** Only directories with at least one unclaimed file, worst first. */
  dirs: CoverageDir[];
  /** Exact totals across the repo — never capped. */
  unclaimed: number;
  claimed: number;
  total: number;
  /** Files a feature claims that are not source files at all — templates, manifests, config.
   *  Not a problem: they are verified to exist, they simply do not count towards coverage. */
  extra: number;
}

const dirOf = (rel: string): string => {
  const i = rel.lastIndexOf('/');
  return i === -1 ? '.' : rel.slice(0, i);
};

export function computeCoverage(repo: string, model: Model): Coverage {
  const sources = trackedSources(repo);
  const claimed = claims(model.features);

  const byDir = new Map<string, { unclaimed: string[]; total: number }>();
  let unclaimedTotal = 0;
  for (const rel of sources) {
    const d = dirOf(rel);
    const bucket = byDir.get(d) ?? { unclaimed: [], total: 0 };
    bucket.total++;
    if (!claimed.has(rel)) { bucket.unclaimed.push(rel); unclaimedTotal++; }
    byDir.set(d, bucket);
  }

  const dirs: CoverageDir[] = [...byDir.entries()]
    .filter(([, b]) => b.unclaimed.length)
    .map(([dir, b]) => ({
      dir,
      shown: b.unclaimed.slice(0, DIR_LISTING_CAP),
      unclaimed: b.unclaimed.length,
      total: b.total,
    }))
    .sort((a, b) => b.unclaimed - a.unclaimed || a.dir.localeCompare(b.dir));

  const sourceSet = new Set(sources);
  let extra = 0;
  for (const p of claimed.keys()) if (!sourceSet.has(p)) extra++;

  return {
    dirs,
    unclaimed: unclaimedTotal,
    claimed: sources.length - unclaimedTotal,
    total: sources.length,
    extra,
  };
}
