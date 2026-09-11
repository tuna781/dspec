// ============================================================
// The read model — what `.ds/` becomes once it is loaded
//
// One structure, read by every other layer: the linter, the renderers, the pack, the coverage
// walk. It is deliberately small. dspec-lang has one authored element — the feature — so this
// file has one interesting type, and everything else is the product wrapper around it.
// ============================================================

/** The unit of dspec-lang: one feature, one file, one name. */
export interface Feature {
  /** The address. Unique across the model, and what `uses` resolves against. */
  name: string;
  /** A label that groups the index. Not a boundary: nothing is filed inside one. */
  area: string;
  /** Every file this feature lives in, repo-relative. At least one, or it describes nothing. */
  code: string[];
  /** Where to start reading — a symbol declared in one of `code`. */
  entry?: string;
  /** The features this one depends on, by `name`. THE ONLY EDGES IN THE MODEL. */
  uses: string[];
  /** Tests that actually prove what this file describes. Never inferred from a filename. */
  tests: string[];
  /**
   * Fingerprint of the `code` files, written by `dspec sync`.
   *
   * ⚠️ **Absent means NOTHING IS KNOWN about freshness** — never "fine". The distinction is the
   * whole reason this is optional rather than defaulted: a model that reports an unmeasured
   * feature as current is worse than one that reports nothing at all.
   */
  stamp?: string;
  /** The prose before the first label — what this is, in product terms. */
  lead: string;
  /** Lines under `Rules`. */
  rules: string[];
  /** Lines under `Behaviour`. */
  behaviour: string[];
  /** The body exactly as written, for renderers that pass it through untouched. */
  body: string;
}

/** `product.md` — the vision and the rules that outlive every feature. */
export interface Product {
  name: string;
  /** The prose before the first label. */
  vision: string;
  /** Lines under `Rules` — prepended to every answer the model gives, so it stays short. */
  rules: string[];
}

export interface Model {
  product: Product;
  /** `glossary.md`, passed through verbatim. Prose for a reader, never parsed. */
  glossary: string;
  features: Feature[];
}

/** Where each feature was read from — keyed by object identity, never by name.
 *
 * ⚠️ Identity is the object. Keying by name collapses two same-named features onto one file, and
 * the stamp writer would then put one feature's fingerprint into the other's file — a wrong value
 * that reads exactly like a right one, and that no later run could correct.
 */
export type SourceOf = Map<Feature, string>;

export interface Loaded {
  model: Model;
  sourceOf: SourceOf;
}

/** The first sentence of the lead — what the index prints. Derived, never stored. */
export function summaryOf(f: Feature): string {
  const lead = f.lead.replace(/\s+/g, ' ').trim();
  if (!lead) return '';
  const m = /^.*?\.( |$)/.exec(lead);
  let first = (m ? m[0] : lead).trim().replace(/\.$/, '');
  // A lead whose first sentence runs on is trimmed at a word boundary rather than mid-word: the
  // index is read at a glance, and a line that wraps three times is a line nobody reads.
  if (first.length > 170) first = first.slice(0, 170).replace(/\s+\S*$/, '') + '…';
  return first;
}

/** Features grouped by `area`, each group sorted by name. Insertion order of areas is preserved. */
export function byArea(features: Feature[]): Map<string, Feature[]> {
  const out = new Map<string, Feature[]>();
  for (const f of features) {
    const list = out.get(f.area);
    if (list) list.push(f);
    else out.set(f.area, [f]);
  }
  for (const list of out.values()) list.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

/** Case- and whitespace-insensitive lookup key. One definition, used by every resolver. */
export const normName = (s: string): string => s.toLowerCase().trim().replace(/\s+/g, ' ');

/** Find a feature by name. `uses` and `dspec spec` must resolve identically, so both ask here. */
export function findFeature(model: Model, name: string): Feature | undefined {
  const want = normName(name);
  return model.features.find((f) => normName(f.name) === want);
}

/** Every file claimed by any feature → the features claiming it. */
export function claims(features: Feature[]): Map<string, Feature[]> {
  const out = new Map<string, Feature[]>();
  for (const f of features) {
    for (const p of f.code) {
      const list = out.get(p);
      if (list) list.push(f);
      else out.set(p, [f]);
    }
  }
  return out;
}
