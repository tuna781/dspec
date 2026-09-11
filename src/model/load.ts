// ============================================================
// `.ds/` → Model
//
// Four file kinds, and only one of them is authored prose. The path of a feature file carries NO
// meaning: subfolders under `features/` are a human convenience and are walked recursively, so a
// model can be reorganised on disk without changing a single thing about what it says. That is the
// deliberate: a layout that carries meaning forces a filing decision a feature can outgrow.
// ============================================================

import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseDoc } from './frontmatter';
import type { YamlValue } from './yaml';
import { parseBody, section } from './sections';
import type { Feature, Loaded, Model, Product, SourceOf } from './types';

export const SPEC_DIR = '.ds';
export const FEATURES_DIR = 'features';
export const PRODUCT_FILE = 'product.md';
export const GLOSSARY_FILE = 'glossary.md';
export const INDEX_FILE = 'index.md';

// ─── Reading YAML values defensively ────────────────────────────────────────
//
// Frontmatter is typed by humans and agents, so wrong shapes are ordinary. A wrong type means
// SKIP THAT VALUE, never throw: one malformed file must not destroy the very report that would
// tell the user where they mistyped. Syntax errors are a different matter — those throw in
// `yaml.ts`, because a `code:` list that silently vanishes takes a feature out of every check.

const str = (v: YamlValue): string =>
  typeof v === 'string' ? v.trim()
  : typeof v === 'number' || typeof v === 'boolean' ? String(v)
  : '';

/** Accepts both `a` and `[a, b]` — a single-entry list written bare is the commonest shape. */
function strList(v: YamlValue): string[] {
  if (typeof v === 'string') return v.trim() ? [v.trim()] : [];
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((s) => s.trim());
}

/**
 * `place-order.md` → `Place order`, for a file whose frontmatter declares no `name`.
 *
 * It deliberately does not guess mid-sentence capitalisation: guessing one capital wrong produces
 * two labels for one feature, and `uses` would resolve against neither.
 */
function nameFromFile(file: string): string {
  const base = path.basename(file, '.md').replace(/^_/, '');
  const words = base.replace(/[-_]+/g, ' ').trim();
  return words ? words[0].toUpperCase() + words.slice(1) : base;
}

/** Every `.md` under a directory, recursively, sorted — dotfiles and dot-directories skipped. */
function listMdDeep(dir: string, rel = ''): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (e.name.startsWith('.')) continue;
    const child = path.join(dir, e.name);
    const childRel = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...listMdDeep(child, childRel));
    else if (e.name.endsWith('.md')) out.push(childRel);
  }
  return out;
}

// ─── The kinds ──────────────────────────────────────────────────────────────

function loadProduct(root: string): Product {
  const file = path.join(root, PRODUCT_FILE);
  if (!fs.existsSync(file)) return { name: '', vision: '', rules: [] };
  const doc = parseDoc(fs.readFileSync(file, 'utf-8'), `${SPEC_DIR}/${PRODUCT_FILE}`);
  const body = parseBody(doc.body);
  return { name: str(doc.meta.name), vision: body.lead, rules: section(body, 'Rules') };
}

function loadFeature(abs: string, rel: string): Feature {
  const doc = parseDoc(fs.readFileSync(abs, 'utf-8'), rel);
  const body = parseBody(doc.body);
  return {
    name: str(doc.meta.name) || nameFromFile(rel),
    area: str(doc.meta.area),
    code: strList(doc.meta.code),
    entry: str(doc.meta.entry) || undefined,
    uses: strList(doc.meta.uses),
    tests: strList(doc.meta.tests),
    stamp: str(doc.meta.stamp) || undefined,
    lead: body.lead,
    rules: section(body, 'Rules'),
    behaviour: section(body, 'Behaviour'),
    body: doc.body,
  };
}

/**
 * Load the whole model from `<repo>/.ds/`.
 *
 * `repo` is the repo root, not the `.ds` directory — so every path this returns is relative to the
 * repo root, the same form `code:` uses, and the two can be compared without any caller having to
 * normalise them.
 */
export function loadModel(repo: string): Loaded {
  const root = path.join(repo, SPEC_DIR);
  if (!fs.existsSync(root)) {
    throw new Error(`no \`${SPEC_DIR}/\` found in ${repo} — run \`dspec sync --write\` to scaffold one`);
  }

  const sourceOf: SourceOf = new Map();
  const features: Feature[] = [];
  const base = path.join(root, FEATURES_DIR);
  for (const relInDir of listMdDeep(base)) {
    const rel = `${SPEC_DIR}/${FEATURES_DIR}/${relInDir}`;
    const feature = loadFeature(path.join(base, relInDir), rel);
    features.push(feature);
    sourceOf.set(feature, rel);
  }

  const glossaryFile = path.join(root, GLOSSARY_FILE);
  const model: Model = {
    product: loadProduct(root),
    glossary: fs.existsSync(glossaryFile) ? fs.readFileSync(glossaryFile, 'utf-8').trim() : '',
    features,
  };
  if (!model.product.name) model.product.name = path.basename(path.resolve(repo));

  return { model, sourceOf };
}

/** Does this repo hold a model at all? Asked before every command that reads one. */
export function hasModel(repo: string): boolean {
  return fs.existsSync(path.join(repo, SPEC_DIR));
}
