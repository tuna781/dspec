// ============================================================
// "What does the model already know about this?"
//
// ⚠️ **A LOOKUP, not a search.** Matching a request against every element name by word
// overlap produced the failure this whole module is shaped around: asked about *"fingerprint the code
// and report drift"*, it matched the word "Report" — a private helper in an unrelated file —
// returned that file as the code map, and then told the agent that everything else was
// unaffected. A false scope, asserted as authority.
//
// So this resolves a NAME. `resolve` is that lookup and nothing else, and what it returns is the
// only thing allowed into the Code Map.
//
// ⚠️ **`suggest` exists, and it is not the same thing.** Agent requests arrive as free text — a PR
// title, a failing command, a review comment — and almost never carry a feature's name, so a
// name-only lookup answers "I do not know" far more often than it needs to. `suggest` ranks
// features by words shared with the request, and the ranking is a GUESS.
//
// The line between them is the whole design, and it is a placement rule, not a scoring one:
//
//   `resolve` → the Code Map → "files not listed here are unaffected"   ← asserted as scope
//   `suggest` → "decide, do not assume" → nothing, until a human picks  ← asserted as nothing
//
// A weak match printed under a heading that calls it weak is not a false scope; a weak match
// promoted into the Code Map is exactly the failure above. Word overlap is only dangerous when it
// is allowed to speak with authority, so it is never given any.
// ============================================================

import { byArea, findFeature, normName, summaryOf, type Feature, type Model } from '../model/types';
import { computeStaleness, STALE_LABEL, type StaleItem } from '../code/staleness';
import { lintModel } from './lint';
import { INDEX_FILE, SPEC_DIR } from '../model/load';

export interface PackOptions {
  /** Names seeded by hand. They always win outright over what the request resolved to. */
  touch?: string[];
}

export interface Resolution {
  /** The features the request names, in the order they were found. */
  hits: Feature[];
  /** `--touch` names that resolve to nothing — reported, never silently dropped. */
  unresolved: string[];
}

/**
 * Resolve a request to features.
 *
 * Two tiers, both exact: the request IS a feature name, or a feature's whole name occurs inside
 * it on word boundaries. Nothing weaker. A name occurring inside a sentence is a statement the
 * writer made; an overlapping token is a coincidence the tool would be inventing meaning from.
 */
export function resolve(model: Model, request: string, opts: PackOptions = {}): Resolution {
  const hits: Feature[] = [];
  const unresolved: string[] = [];
  const add = (f: Feature) => { if (!hits.includes(f)) hits.push(f); };

  for (const name of opts.touch ?? []) {
    const f = findFeature(model, name);
    if (f) add(f);
    else unresolved.push(name);
  }

  const exact = findFeature(model, request);
  if (exact) add(exact);
  else {
    const hay = ` ${normName(request)} `;
    for (const f of model.features) {
      // Word boundaries, so `Drift detection` does not match inside a longer word, and a
      // one-word feature name cannot match a fragment of an unrelated one.
      if (new RegExp(`(^|[^\\p{L}\\p{N}])${escape(normName(f.name))}([^\\p{L}\\p{N}]|$)`, 'u').test(hay)) add(f);
    }
  }

  return { hits, unresolved };
}

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Words too common to carry meaning.
 *
 * Deliberately short. An aggressive list starts dropping real domain words, and a missed
 * suggestion is worse than a noisy one here — the noisy one is visible under a heading telling you
 * to judge it, and the missed one is not there to be judged at all.
 */
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'for', 'to', 'in', 'on', 'with', 'by', 'from', 'is', 'are',
  'be', 'do', 'does', 'how', 'what', 'which', 'when', 'why', 'we', 'i', 'my', 'it', 'its', 'this',
  'that', 'add', 'new', 'change', 'update', 'make', 'fix', 'support', 'allow', 'let', 'want',
  'need', 'should', 'can', 'not', 'after', 'before', 'into', 'out', 'up', 'too', 'file', 'files',
]);

/** Crude suffix stripping — enough that `renders`/`rendered`/`rendering` meet at `render`. */
const stem = (w: string): string => w.replace(/(ing|ed|es|s)$/, '');

function terms(text: string): string[] {
  return [...new Set(
    text.toLowerCase().split(/[^\p{L}\p{N}]+/u)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
      .map(stem),
  )];
}

export interface Suggestion {
  feature: Feature;
  /** The request's words this feature matched, for the reader to judge rather than trust. */
  shared: string[];
  score: number;
}

/**
 * Rank features by words shared with the request. **A guess, and labelled as one everywhere it is
 * rendered.**
 *
 * ⚠️ **A name hit outweighs a body hit**, because the two are not equal evidence: a word in the
 * feature's own name is what somebody chose to call it, while a word in a paragraph may be an
 * aside. Without the weighting, a long body full of incidental vocabulary outranks the feature the
 * request is actually about — which is how a search that "works" starts recommending whichever
 * feature happens to be the most verbose.
 */
export function suggest(model: Model, request: string, exclude: Feature[] = []): Suggestion[] {
  const wanted = terms(request);
  if (!wanted.length) return [];

  const out: Suggestion[] = [];
  for (const f of model.features) {
    if (exclude.includes(f)) continue;
    // `code:` is included on purpose: "the YAML parser rejects my file" should reach the feature
    // that owns `yaml.ts` even when its prose never says the word.
    const name = stem(`${f.name} ${f.area}`.toLowerCase());
    const body = stem(`${f.lead} ${f.rules.join(' ')} ${f.behaviour.join(' ')} ${f.code.join(' ')}`.toLowerCase());

    const shared: string[] = [];
    let score = 0;
    for (const w of wanted) {
      if (name.includes(w)) { score += 3; shared.push(w); }
      else if (body.includes(w)) { score += 1; shared.push(w); }
    }
    if (score > 0) out.push({ feature: f, shared, score });
  }

  // Ties broken by name, so the same request always produces the same listing — a suggestion that
  // reorders between runs is one nobody can discuss.
  return out.sort((a, b) => b.score - a.score || a.feature.name.localeCompare(b.feature.name)).slice(0, 5);
}

/** The depth-1 closure: the features named, plus everything they use. */
export function closure(model: Model, seeds: Feature[]): { seeds: Feature[]; used: Feature[] } {
  const used: Feature[] = [];
  for (const s of seeds) {
    for (const name of s.uses) {
      const f = findFeature(model, name);
      if (f && !seeds.includes(f) && !used.includes(f)) used.push(f);
    }
  }
  return { seeds, used };
}

function renderFeature(f: Feature, heading: string): string[] {
  const out = [`### ${heading}: ${f.name}`, ''];
  if (f.area) out.push(`_Area: ${f.area}_`, '');
  out.push(`**Files:** ${f.code.map((c) => `\`${c}\``).join(', ')}`);
  if (f.entry) out.push(`**Start at:** \`${f.entry}\``);
  if (f.uses.length) out.push(`**Uses:** ${f.uses.join(', ')}`);
  if (f.tests.length) out.push(`**Proven by:** ${f.tests.map((t) => `\`${t}\``).join(', ')}`);
  out.push('');
  if (f.body.trim()) out.push(f.body.trim(), '');
  return out;
}

/**
 * A DEPENDENCY, rendered as what it guarantees rather than as how it works.
 *
 * Measured on this repo's own model, the depth-1 closure was **58% of the pack** — every
 * dependency rendered at the same fidelity as the feature actually being worked on. That is the
 * wrong thing to spend a context window on: a dependency is read to find out what it promises,
 * and how it keeps that promise is what its own pack is for.
 *
 * ⚠️ **Rules survive; behaviour does not.** The pack exists partly to surface the rule a request
 * contradicts, and that rule is quite often a dependency's — dropping rules to make the saving
 * larger would hide exactly what this is built to show, which is the same failure as a warning
 * that switches off when it is needed. Behaviour describes the inside, and the inside is not
 * this reader's problem.
 */
function renderContract(f: Feature): string[] {
  const out = [`### Uses: ${f.name}`, ''];
  if (f.area) out.push(`_Area: ${f.area}_`, '');
  // Files and entry stay: the Code Map is flat, so this is the only thing saying which of those
  // paths belong to which dependency. `uses:` and `tests:` go — one is depth-2 noise, the other
  // is for whoever edits this feature, and that is not the reader of a contract.
  out.push(`**Files:** ${f.code.map((c) => `\`${c}\``).join(', ')}`);
  if (f.entry) out.push(`**Start at:** \`${f.entry}\``);
  out.push('');
  if (f.lead.trim()) out.push(f.lead.trim(), '');
  if (f.rules.length) out.push('Rules', ...f.rules, '');
  // Nothing here is unreachable, and the way to reach it is named on the spot rather than left
  // for the reader to remember.
  out.push(`_Contract only. Full description: \`dspec spec "${f.name}"\`, or add \`--touch "${f.name}"\` to pull it in here._`, '');
  return out;
}

/**
 * The warning block.
 *
 * ⚠️ It comes BEFORE the rules it qualifies, because a reliability warning read after the content
 * it applies to has already failed to do its job. The closing sentence is not removable: an agent
 * that reads "no warnings" as "everything here is current" has been misled by omission.
 */
function renderWarnings(features: Feature[], stale: StaleItem[], model: Model): string[] {
  const names = new Set(features.map((f) => f.name));
  const rows: string[] = [];

  for (const s of stale) {
    if (!names.has(s.feature)) continue;
    rows.push(`- **${s.feature}** — ${STALE_LABEL[s.kind]}: ${s.detail}`);
  }
  for (const f of lintModel(model)) {
    if (f.code !== 'no_body' || !f.feature || !names.has(f.feature)) continue;
    rows.push(`- **${f.feature}** — ${f.detail}`);
  }
  if (!rows.length) return [];

  return [
    '## ⚠ Unreliable in this task',
    '',
    rows.length === 1
      ? '_One feature here is incomplete or unproven._'
      : `_${rows.length} features here are incomplete or unproven._`,
    '',
    '**Ask before inferring their behaviour. Do not fill the gaps from the code, from naming,',
    'or from convention — that guess is exactly what this document exists to prevent.**',
    '',
    '_These warnings reflect the last scan. The absence of a warning is not evidence that a',
    'description is current._',
    '',
    ...rows,
    '',
  ];
}

/** The index, printed when the request names nothing — the answer to "then what ARE the options". */
function renderIndexListing(model: Model): string[] {
  const out: string[] = [];
  for (const [area, features] of [...byArea(model.features).entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    out.push(`**${area || 'No area'}**`);
    for (const f of features) out.push(`- ${f.name}${summaryOf(f) ? ` — ${summaryOf(f)}` : ''}`);
    out.push('');
  }
  return out;
}

export function renderPack(repo: string, model: Model, request: string, opts: PackOptions = {}): string {
  const { hits, unresolved } = resolve(model, request, opts);
  const lines: string[] = [
    `# Context Pack — ${request}`,
    '',
    `> What the model at \`${SPEC_DIR}/\` knows about **${request}**, for **${model.product.name}**.`,
    '> Nothing here has changed; this is the ground you are building on.',
    '',
  ];

  if (unresolved.length) {
    lines.push(
      '## Seeds that did not resolve',
      '',
      ...unresolved.map((n) => `- \`${n}\` — no feature by that name`),
      '',
    );
  }

  if (!hits.length) {
    lines.push(
      '## The model does not name this',
      '',
      '**No feature matches this request by name**, so there is no Code Map below and nothing here',
      'is scope. Either the work is genuinely new, or it is described under a name this request did',
      'not use.',
      '',
    );

    const guesses = suggest(model, request);
    if (guesses.length) {
      lines.push(
        '## Possibly related — decide, do not assume',
        '',
        '_Ranked by words these features share with your request. **A shared word is a coincidence',
        'until you have judged it**, so none of this is a code map and none of it is scope. Read the',
        'one that looks right and re-run by name:_ `dspec spec "<Feature>"`.',
        '',
      );
      for (const g of guesses) {
        const why = `shares ${g.shared.map((w) => `"${w}"`).join(', ')}`;
        lines.push(`- **${g.feature.name}** — ${summaryOf(g.feature)}`);
        lines.push(`  ${why} · ${g.feature.code.map((c) => `\`${c}\``).join(', ')}`);
      }
      lines.push('');
    }

    // ⚠️ The complete listing stays, and stays BELOW the guesses. The ranking is a guess; this is
    // the truth, and a reader who distrusts the guess must not have to ask for the alternative.
    lines.push(
      guesses.length
        ? '### …or pick from every feature in the model'
        : '### Every feature in the model',
      '',
      ...renderIndexListing(model),
      `Nothing matching? Ask the user where this belongs before assuming the work is new — and read`,
      `\`${SPEC_DIR}/${INDEX_FILE}\` for the same list at any time.`,
      '',
    );
    return lines.join('\n').replace(/\n+$/, '\n');
  }

  const { seeds, used } = closure(model, hits);
  const inScope = [...seeds, ...used];
  const stale = computeStaleness(repo, model);

  lines.push(...renderWarnings(inScope, stale, model));

  if (model.product.rules.length) {
    lines.push('## Product rules', '', '_They apply to every change._', '', ...model.product.rules, '');
  }

  lines.push(
    '## Code Map',
    '',
    '_The files bound to this task. Modify only what the task requires; read the rest for context._',
    '_**Files not listed here are unaffected — do not modify them.**_',
    '',
  );
  const files = new Set<string>();
  for (const f of inScope) for (const c of f.code) files.add(c);
  for (const c of [...files].sort()) lines.push(`- \`${c}\``);
  lines.push('');

  lines.push('## The feature', ...['']);
  for (const f of seeds) lines.push(...renderFeature(f, 'Feature'));

  if (used.length) {
    lines.push(
      '## What it uses',
      '',
      '_One hop out. These are declared dependencies, not guesses — changing one changes this._',
      '_Each is a **contract**: what it promises and the rules it holds you to, not how it works._',
      '',
    );
    for (const f of used) lines.push(...renderContract(f));
  }

  lines.push('---', '', `_Generated by dspec. Features not listed above are unaffected by this task._`, '');
  return lines.join('\n').replace(/\n+$/, '\n');
}
