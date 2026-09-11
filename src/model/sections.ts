// ============================================================
// Reading the labelled sections of a body
//
// The vocabulary itself — and every gloss teaching an agent to write to it — lives in
// `./language.ts`. This file holds only the RECOGNITION of a label inside a body.
// ============================================================

import { BODY_LABELS, type BodyLabel } from './language';

export { BODY_LABELS };
export type { BodyLabel };

const LABEL_SET = new Set<string>(BODY_LABELS.map((s) => s.toLowerCase()));

/**
 * Is this line a section LABEL? Returns the canonical name, or `null`.
 *
 * ⚠️ **A label is a BARE LINE OF TEXT, not a heading.** Agents are taught to write `Rules` and
 * drop straight into bullets, so recognition keyed to a markdown heading would report a false
 * negative on every agent-written body. A heading form is accepted too, and so is a trailing
 * colon: punishing correct content over a choice of font size is a bad rule.
 */
function labelOf(raw: string, vocab: Set<string> = LABEL_SET): string | null {
  const line = raw.replace(/^#{1,6}\s*/, '').replace(/[:：]\s*$/, '').trim().toLowerCase();
  return line && vocab.has(line) ? line : null;
}

export interface Body {
  /** Everything before the first label. Never discarded — see below. */
  lead: string;
  /** Non-blank lines under each label, keyed by the canonical label name. */
  sections: Map<BodyLabel, string[]>;
}

/**
 * Split a body into its lead and its labelled sections.
 *
 * ⚠️ **Prose under an unrecognised label is kept, not dropped.** A writer reaching for a sixth
 * label has written something real; silently discarding it would lose their words while the
 * rendered artifact looked complete. It stays with whatever section it followed, and the linter
 * says nothing — a label nobody recognises costs a heading in the output, where it is visible
 * immediately, which is a different class of mistake from one that hides.
 */
export function parseBody(text: string): Body {
  const canonical = new Map<string, BodyLabel>(BODY_LABELS.map((s) => [s.toLowerCase(), s]));
  const sections = new Map<BodyLabel, string[]>();
  const leadLines: string[] = [];
  let current: BodyLabel | null = null;

  for (const raw of (text || '').split('\n')) {
    const label = labelOf(raw);
    if (label) {
      current = canonical.get(label)!;
      if (!sections.has(current)) sections.set(current, []);
      continue;
    }
    if (current === null) leadLines.push(raw);
    else if (raw.trim()) sections.get(current)!.push(raw.trimEnd());
  }

  return { lead: leadLines.join('\n').trim(), sections };
}

/** The lines under one label, or `[]`. */
export function section(body: Body, name: BodyLabel): string[] {
  return body.sections.get(name) ?? [];
}
