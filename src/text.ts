// ============================================================
// Small text helpers shared by every layer
//
// Lives at the root on purpose: `src/compile/` renders artifacts and must never import from
// `src/cli/`, so anything both sides need cannot live in either.
// ============================================================

/**
 * `1 file` · `3 files` · `2 entities`.
 *
 * Written out rather than left as `file(s)` because compile output is read by agents and CLI
 * output is the first thing a user sees — and `entity(ies)` is not a word. English only: the CLI
 * has no locale, and the vocabulary an agent parses is English by definition (`model/language.ts`).
 */
export function plural(n: number, one: string, many = one + 's'): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * `src/code/hash.ts` → `Hash` · `place_order` → `Place order`.
 *
 * Used when proposing a name from a path. It deliberately does not try to guess mid-sentence
 * capitalisation: guessing one capital wrong produces two labels for one feature, and `uses:`
 * would resolve against neither.
 */
export function humanise(token: string): string {
  const words = token
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim();
  if (!words) return token;
  return words[0].toUpperCase() + words.slice(1).toLowerCase();
}

/**
 * `Drift detection` → `drift-detection`.
 *
 * ⚠️ Must stay the inverse of the loader's filename fallback, which turns `drift-detection.md`
 * back into `Drift detection`. Nothing in the type system asks them to agree, so a change to
 * either has to be made to both — otherwise a scaffolded file loads under a name its own
 * frontmatter contradicts.
 */
export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unnamed';
}
