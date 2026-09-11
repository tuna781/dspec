// ============================================================
// The six rules
//
// Six, down from sixteen. What survived is decided by one question: **does this failure hide?**
//
// A typo in `uses:` silently costs an edge, and the symptom — a pack missing context — surfaces
// somewhere else, much later. That is an error. A typo in `area:` costs a heading in the index,
// where the writer sees it the moment they look. That needs no rule at all. Ten earlier rules were
// dropped either with the concept they policed, or because what they caught was already visible.
//
// ⚠️ **A finding is a judgement about description quality, never a disagreement with the code.**
// It is reported, and only `dspec sync --strict` decides whether an error is worth an exit code.
// ============================================================

import { claims, normName, type Feature, type Model } from '../model/types';
import { computeCoverage } from '../code/coverage';
import { computeStaleness } from '../code/staleness';

/**
 * Every rule this linter can report.
 *
 * ⚠️ **An ARRAY, so the count can be derived rather than typed.** The CLI usage, the README and
 * the changelog all describe the linter as "N rules"; kept by hand, those copies disagree the
 * first time a rule is added, and the user reading a stale number is being told something false
 * by the tool itself.
 */
export const LINT_RULE_CODES = [
  /** Two features share a name — the address is ambiguous and `uses` cannot resolve it. */
  'duplicate_name',
  /** A `code:` path is not on disk, the list is empty, or `entry:` is declared in none of them. */
  'missing_code',
  /** A `uses:` entry names no feature. */
  'unresolved_use',
  /** A `tests:` path no longer exists — the evidence is gone, not the code. */
  'missing_test',
  /** A feature with no lead paragraph: nothing states what it is. */
  'no_body',
  /** A tracked source file no feature claims. */
  'unclaimed_code',
] as const;

export type LintCode = (typeof LINT_RULE_CODES)[number];
export type Severity = 'error' | 'warn' | 'info';

export const SEVERITY: Record<LintCode, Severity> = {
  duplicate_name: 'error',
  missing_code: 'error',
  unresolved_use: 'error',
  missing_test: 'warn',
  no_body: 'warn',
  unclaimed_code: 'info',
};

export interface Finding {
  code: LintCode;
  severity: Severity;
  /** The feature the finding is about; absent for repo-level findings. */
  feature?: string;
  /** The path, name or symbol at fault. */
  subject?: string;
  detail: string;
}

const ORDER: Record<Severity, number> = { error: 0, warn: 1, info: 2 };
const sorted = (f: Finding[]): Finding[] => f.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);

const finding = (code: LintCode, detail: string, extra: Partial<Finding> = {}): Finding => ({
  code, severity: SEVERITY[code], detail, ...extra,
});

/**
 * The rules answerable from the model alone — a pure function, so it is deterministic and
 * snapshot-testable, and so a caller holding only a model can still ask.
 *
 * The rules that need the checkout live in `lintRepo` below, because a rule that silently returns
 * nothing when it cannot read the disk is worse than one that is not asked.
 */
export function lintModel(model: Model): Finding[] {
  const out: Finding[] = [];
  const names = new Set(model.features.map((f) => normName(f.name)));

  // ⚠️ Grouped by the NORMALISED name and reported once per group. Grouping by the name as typed
  // reports `Drift detection` and `drift detection` as two separate findings — two warnings for
  // one problem, neither of which tells the reader what actually clashes.
  const groups = new Map<string, { label: string; count: number }>();
  for (const f of model.features) {
    const key = normName(f.name);
    const g = groups.get(key);
    if (g) g.count++;
    else groups.set(key, { label: f.name, count: 1 });
  }
  for (const g of groups.values()) {
    if (g.count > 1) {
      out.push(finding('duplicate_name', `${g.count} features share this name — nothing can tell them apart; rename one`, { feature: g.label }));
    }
  }

  for (const f of model.features) {
    if (!f.code.length) {
      out.push(finding('missing_code', 'declares no `code:` — it describes nothing that exists', { feature: f.name }));
    }
    for (const u of f.uses) {
      if (!names.has(normName(u))) {
        out.push(finding('unresolved_use', `\`uses: ${u}\` resolves to no feature — a typo here silently costs an edge`, { feature: f.name, subject: u }));
      }
    }
    if (!f.lead.trim()) {
      out.push(finding('no_body', 'no lead paragraph — nothing states what this is', { feature: f.name }));
    }
  }

  return sorted(out);
}

/**
 * Every rule, including the ones that must read the checkout.
 *
 * It composes `computeStaleness` and `computeCoverage` rather than re-deriving their answers: two
 * implementations of "is this path on disk" would disagree the day either is touched, and nothing
 * would record it.
 */
export function lintRepo(repo: string, model: Model): Finding[] {
  const out = lintModel(model);

  for (const s of computeStaleness(repo, model)) {
    if (s.kind === 'code_missing' || s.kind === 'entry_lost') {
      out.push(finding('missing_code', s.detail, { feature: s.feature, subject: s.subject }));
    } else if (s.kind === 'test_missing') {
      out.push(finding('missing_test', s.detail, { feature: s.feature, subject: s.subject }));
    }
    // `unmeasured` and `stale` are MEASUREMENTS, not quality judgements, and they are reported
    // by the staleness walk itself. Folding them in here would let a re-stamp silence a lint
    // error, which is the one thing an error must never be.
  }

  const coverage = computeCoverage(repo, model);
  for (const dir of coverage.dirs) {
    out.push(finding('unclaimed_code', `${dir.unclaimed} of ${dir.total} files here are described by no feature: ${dir.shown.join(', ')}${dir.unclaimed > dir.shown.length ? `, +${dir.unclaimed - dir.shown.length} more` : ''}`, { subject: dir.dir }));
  }

  return sorted(out);
}

/** Features claiming the same file — not a finding, but what the post-edit hook prints. */
export function featuresClaiming(model: Model, file: string): Feature[] {
  return claims(model.features).get(file) ?? [];
}
