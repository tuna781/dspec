// ============================================================
// Frontmatter — separating `---…---` from the markdown body
//
// The contract of the whole storage format: **machine metadata on top, prose that humans and
// agents read below, never mixed.** `codeRef`/`hash`/`verifiedBy` are data; `Rules`/`Input`
// are what an agent reads as law. Mixing the two invites an agent to read a file path as a
// business constraint.
// ============================================================

import { parseYaml, dumpYaml, type YamlValue } from './yaml';

export interface Doc {
  /** Parsed frontmatter. No frontmatter ⇒ `{}`, never `null`. */
  meta: { [k: string]: YamlValue };
  /** The body, trimmed at both ends. */
  body: string;
}

const FENCE = /^---[ \t]*\r?\n/;

/**
 * Split one `.md` file.
 *
 * ⚠️ An opening `---` with no closing one is an **error**, not "treat it as having no
 * frontmatter". That happens when somebody — human or agent — leaves an edit half finished;
 * treating the whole file as body makes `codeRef` vanish silently and drops the element back
 * to unbound.
 */
export function parseDoc(src: string, where?: string): Doc {
  const text = src.replace(/^﻿/, '');
  if (!FENCE.test(text)) return { meta: {}, body: text.trim() };

  const afterOpen = text.slice(text.indexOf('\n') + 1);
  const close = /^---[ \t]*$/m.exec(afterOpen);
  if (!close) {
    throw new Error(`${where ? where + ': ' : ''}frontmatter opens with \`---\` but never closes it`);
  }
  const raw = afterOpen.slice(0, close.index);
  const body = afterOpen.slice(close.index + close[0].length);

  // `raw` starts on file line 2: `FENCE` consumes exactly the opening `---` line. Without this
  // offset every YAML error would point one line above the real one.
  const parsed = parseYaml(raw, where, 2);
  if (parsed !== null && (typeof parsed !== 'object' || Array.isArray(parsed))) {
    throw new Error(`${where ? where + ': ' : ''}frontmatter must be a \`key: value\` map`);
  }
  return { meta: (parsed as { [k: string]: YamlValue }) ?? {}, body: body.trim() };
}

/** Rebuild a `.md` file. Empty meta ⇒ no `---` block at all (do not manufacture noise). */
export function renderDoc(doc: Doc): string {
  const meta = dumpYaml(doc.meta);
  const body = doc.body.trim();
  if (!meta) return body ? `${body}\n` : '';
  return `---\n${meta}\n---\n\n${body}\n`;
}
