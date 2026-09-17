// ============================================================
// The model's vocabulary — **one single source**
//
// The keys, the labels, the glosses and the worked example are declared HERE, and every surface
// that teaches an agent to write the model is generated from this file: `dspec sync --guide` and
// the line the bootstrap command carries. No document teaches it — the model is internal.
//
// ⚠️ **This is not a style choice; it is the fix for a measured failure.** The label set was once
// hand-written in seven places — seven copies of a vocabulary the linter penalises against, so six
// of them could drift, and a user who read a drifted copy was penalised for following the
// documentation. `test/model/language.test.js` fails any surface that spells the vocabulary out
// instead of using a `__DS_LANG_*__` placeholder.
//
// ⚠️ **The keys and labels are always English.** They are not interface text but PARSED
// VOCABULARY: recognition lowercases a line and compares it against this set, so translating one
// would change the syntax of the language and every existing model would stop parsing.
// ============================================================

/**
 * The frontmatter keys of a feature file, in the order they should be written.
 *
 * Changing this changes the language: the loader, the linter, the scaffolder and every generated
 * document read from here, so they can no longer disagree.
 */
export const FEATURE_KEYS = ['name', 'area', 'code', 'entry', 'uses', 'tests', 'stamp'] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export interface KeyDoc {
  name: FeatureKey;
  required: boolean;
  /** `you` = a person or their agent writes it · `cli` = the tool writes it, never a human. */
  writer: 'you' | 'cli';
  gloss: string;
}

export const KEYS: KeyDoc[] = [
  {
    name: 'name',
    required: true,
    writer: 'you',
    gloss: 'How this feature is addressed. Unique across the model — `uses` resolves against it.',
  },
  {
    name: 'area',
    required: true,
    writer: 'you',
    gloss: 'A label that groups the index. Free text, and NOT a boundary: nothing is filed inside an area.',
  },
  {
    name: 'code',
    required: true,
    writer: 'you',
    gloss: 'Every file this feature lives in, repo-relative. This is the answer to "where is it".',
  },
  {
    name: 'entry',
    required: false,
    writer: 'you',
    gloss: 'Where to start reading — a symbol declared in one of the `code` files.',
  },
  {
    name: 'uses',
    required: false,
    writer: 'you',
    gloss: 'The features this one depends on, by name. These are the only edges in the model.',
  },
  {
    name: 'tests',
    required: false,
    writer: 'you',
    gloss: 'Tests you have actually read that prove what this file describes. Never guessed from a filename.',
  },
  {
    name: 'stamp',
    required: false,
    writer: 'cli',
    gloss: 'Fingerprint of the `code` files. Written by `dspec sync` — never type it.',
  },
];

/**
 * The labels of a feature body, in recommended order.
 *
 * Two, down from five. `Input`, `Errors` and `Effects` were symbol-level concerns: at the level of
 * a feature they belong inside `Behaviour`, and asking a writer to classify a sentence into five
 * buckets bought nothing the reader could use.
 */
export const BODY_LABELS = ['Rules', 'Behaviour'] as const;

export type BodyLabel = (typeof BODY_LABELS)[number];

export interface LabelDoc {
  name: BodyLabel;
  gloss: string;
  example: string;
}

export const LABELS: LabelDoc[] = [
  {
    name: 'Rules',
    gloss: 'Invariants that must hold — the things a change must not break, and why.',
    example: '- Drift is reported, never auto-fixed: the code is the unreviewed party.',
  },
  {
    name: 'Behaviour',
    gloss: 'What it does, and the cases that matter: order, precedence, what it refuses.',
    example: '- Evidence is checked first, so a lost test is reported even when the file is gone too.',
  },
];

/** The lead paragraph carries no label. Named here so generated docs describe it consistently. */
export const LEAD_GLOSS =
  'The prose before the first label: what this feature IS, in product terms. One paragraph.';

const FILTER_RULE =
  'The filter that decides what goes in: **if one read of the files in `code` would tell you, it ' +
  'is not worth a line.** Write what that read would NOT tell you — why a branch exists, which ' +
  'failure it prevents, what must never change.';

const DECLARED_RULE =
  '`code` and `uses` are **declared, never inferred**. Nothing is guessed from imports, from ' +
  'naming, or from word overlap: a tool that guesses a file list will one day omit the file that ' +
  'mattered, and present the omission as scope. `dspec sync` verifies every path and every name.';

/**
 * `line`  — one sentence, for tight spaces (a seeded file, a command footer).
 * `table` — the keys and the labels as tables.
 * `full`  — the tables, the two rules, and a worked example file.
 */
export type LanguageBlockDepth = 'line' | 'table' | 'full';

/** The labels joined by ` · ` — the shortest form, usable inside a sentence. */
export function labelLine(): string {
  return BODY_LABELS.map((s) => `\`${s}\``).join(' · ');
}

/** The required keys joined by ` · `. */
export function requiredKeyLine(): string {
  return KEYS.filter((k) => k.required).map((k) => `\`${k.name}\``).join(' · ');
}

/** A worked feature file built FROM the declarations, so it can never drift from them. */
export function exampleFeature(): string {
  return [
    '---',
    'name: Drift detection',
    'area: Code measurement',
    'code:',
    '  - src/code/drift.ts',
    '  - src/cli/commands/drift.ts',
    'entry: computeDrift',
    'uses: [Code fingerprint, Model loading]',
    'tests: [test/reconcile/drift.test.js]',
    '---',
    '',
    'Answers the question a file path cannot: is this description still true of the code it points',
    'at. Every answer is measured by re-reading the checkout, never by remembering.',
    '',
    ...LABELS.flatMap((l) => [l.name, l.example, '']),
  ].join('\n').trimEnd();
}

function keyTable(): string {
  const rows = KEYS.map(
    (k) =>
      `| \`${k.name}\` | ${k.required ? '✅' : ''} | ${k.writer === 'cli' ? '**the CLI**' : 'you'} | ${k.gloss} |`,
  );
  return ['| Key | Required | Written by | Meaning |', '|---|---|---|---|', ...rows].join('\n');
}

function labelTable(): string {
  const rows = LABELS.map((l) => `| \`${l.name}\` | ${l.gloss} |`);
  return [
    '| Label | What goes under it |',
    '|---|---|',
    `| *(lead paragraph)* | ${LEAD_GLOSS} |`,
    ...rows,
  ].join('\n');
}

export function renderLanguageBlock(depth: LanguageBlockDepth): string {
  if (depth === 'line') {
    return (
      `A feature file declares ${requiredKeyLine()} in its frontmatter, and its body is a lead ` +
      `paragraph plus the fixed labels ${labelLine()} — nothing else.`
    );
  }

  const tables = [keyTable(), '', labelTable()].join('\n');
  if (depth === 'table') return tables;

  return [
    tables,
    '',
    FILTER_RULE,
    '',
    DECLARED_RULE,
    '',
    'A feature file:',
    '',
    '```markdown',
    exampleFeature(),
    '```',
  ].join('\n');
}

/**
 * `dspec sync --guide` — everything an agent needs before it writes under `.ds/`.
 *
 * ⚠️ **Printed on demand, never shipped as a document.** The model is internal: no README, no
 * installed file teaches its format. An agent that is about to write a feature asks the CLI, and the
 * answer is generated from the same declarations the linter enforces, so it cannot drift from them.
 */
export function renderGuide(): string {
  return [
    '# Writing the product model',
    '',
    'The model lives in `.ds/` and is maintained by you, the agent. The user never edits it; talk to',
    'them about features and behaviour, never about these files.',
    '',
    '- `.ds/product.md` — the product: a lead paragraph, then `Rules` that apply to every change.',
    '- `.ds/glossary.md` — words that mean something specific in this product.',
    '- `.ds/features/*.md` — one file per feature. The path carries no meaning; `area:` groups.',
    '- `.ds/index.md` — generated by `dspec sync --write`. Never edit it.',
    '',
    '## A feature file',
    '',
    renderLanguageBlock('full'),
    '',
    '## Rules',
    '',
    '- **A feature is something a person would name** — a capability of the product. If the feature',
    '  list mirrors the folder tree, the names are wrong. A helper that serves one feature belongs in',
    "  that feature's `code:`, not in a feature of its own.",
    "- **`code:` is every file the feature lives in.** A file no feature claims is reported until one does.",
    '- **The description says what a read of the code would not**: what it does for the product, why a',
    '  branch exists, what must never change. Restating signatures is not a description.',
    '- **A description older than its code**: read both, rewrite the description so it is true of the',
    '  code now, then `dspec accept "<Feature>"`. Never accept a feature you have not read.',
    '- **Never write `stamp`.** `dspec sync --write` measures new features; `dspec accept` re-measures',
    '  a changed one. A typed fingerprint is a claim nobody can check.',
    '- **Never invent `tests:`.** List only tests you have read that exercise the feature.',
    '- **Use the names the model already uses** (features, glossary); do not coin a second word.',
    '- Finish every change with `dspec sync --write`, then `dspec sync --strict` until it is clean.',
  ].join('\n');
}
