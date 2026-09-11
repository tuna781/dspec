// ============================================================
// YAML — a subset, zero dependencies
//
// Only as much as DSpec frontmatter needs: maps nested by indentation, block sequences (`- `),
// flow sequences (`[a, b]`), and scalars. NO anchors, no multi-document, no block scalars
// (`|`, `>`), no complex keys, no flow maps (`{a: b}`).
//
// ⚠️ **Unsupported syntax must THROW, never be skipped.** A parser that returns `{}` on syntax it
// does not recognise makes `codeRef` vanish silently — and an element that is bound but reads as
// unbound drops out of drift entirely while its `hash` is never checked again. That kind of error
// is invisible until somebody trusts an empty report and concludes the wrong thing. Far better to
// go red on the offending line.
// ============================================================

export type YamlValue = string | number | boolean | null | YamlValue[] | { [k: string]: YamlValue };

export class YamlError extends Error {
  constructor(message: string, readonly line: number, readonly where?: string) {
    super(`${where ? where + ' ' : ''}line ${line}: ${message}`);
    this.name = 'YamlError';
  }
}

interface Line {
  /** Indentation in columns (spaces; tabs are rejected). */
  indent: number;
  /** The content, with indentation and any trailing comment removed. */
  text: string;
  /** The 1-based source line — so an error message points at the right place. */
  no: number;
}

/**
 * Strip a trailing comment, respecting quotes.
 *
 * A `#` only opens a comment at the start of a line or AFTER whitespace — as in real YAML. That
 * way `hash: sha256:ab#12` survives intact while `file: a.ts # a note` is trimmed correctly.
 */
function stripComment(s: string): string {
  let quote: string | null = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      if (c === '\\' && quote === '"') i++;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === '#' && (i === 0 || /\s/.test(s[i - 1]))) {
      return s.slice(0, i);
    }
  }
  return s;
}

function scan(src: string, where?: string, firstLine = 1): Line[] {
  const out: Line[] = [];
  const raw = src.split('\n');
  for (let i = 0; i < raw.length; i++) {
    const l = raw[i];
    // Tab indentation is an error in YAML, and the most common one when people type by hand.
    // Guessing on their behalf (tab = N spaces) would make the same file parse into two different
    // trees depending on who opened it, so it is rejected outright.
    const lead = /^[ \t]*/.exec(l)![0];
    if (lead.includes('\t')) throw new YamlError('tab indentation — use spaces', firstLine + i, where);
    const text = stripComment(l).trimEnd();
    if (!text.trim()) continue;
    out.push({ indent: lead.length, text: text.slice(lead.length), no: firstLine + i });
  }
  return out;
}

/** Split a flow sequence `[a, "b, c", d]` — respecting quotes. */
function splitFlow(inner: string, no: number, where?: string): string[] {
  const parts: string[] = [];
  let cur = '';
  let quote: string | null = null;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (quote) {
      cur += c;
      if (c === '\\' && quote === '"') { cur += inner[++i] ?? ''; }
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c; cur += c;
    } else if (c === ',') {
      parts.push(cur); cur = '';
    } else if (c === '[' || c === ']' || c === '{' || c === '}') {
      throw new YamlError('a sequence nested inside a flow sequence is not supported', no, where);
    } else {
      cur += c;
    }
  }
  if (quote) throw new YamlError('unclosed quote', no, where);
  if (cur.trim() || parts.length) parts.push(cur);
  return parts.map((p) => p.trim()).filter((p) => p !== '');
}

function parseScalar(s: string, no: number, where?: string): YamlValue {
  const t = s.trim();
  if (t === '' || t === '~' || t === 'null') return null;
  if (t === 'true') return true;
  if (t === 'false') return false;

  if (t.startsWith('"')) {
    if (!t.endsWith('"') || t.length < 2) throw new YamlError('unclosed double quote', no, where);
    return t.slice(1, -1).replace(/\\(["\\ntr])/g, (_, c) =>
      c === 'n' ? '\n' : c === 't' ? '\t' : c === 'r' ? '\r' : c);
  }
  if (t.startsWith("'")) {
    if (!t.endsWith("'") || t.length < 2) throw new YamlError('unclosed single quote', no, where);
    return t.slice(1, -1).replace(/''/g, "'");
  }
  if (t.startsWith('[')) {
    if (!t.endsWith(']')) throw new YamlError('flow sequence missing its `]`', no, where);
    return splitFlow(t.slice(1, -1), no, where).map((p) => parseScalar(p, no, where));
  }
  if (t.startsWith('{')) throw new YamlError('flow map `{…}` is not supported — use a nested map', no, where);
  if (t === '|' || t === '>') throw new YamlError('block scalar `|`/`>` is not supported — use double quotes', no, where);

  // Numbers: plain decimal only. `2026-08-23` and `1.2.3` must stay strings, so bare `Number()`
  // is not used (it happily swallows `0x10`, `1e5` and whitespace).
  if (/^-?\d+$/.test(t)) return parseInt(t, 10);
  if (/^-?\d+\.\d+$/.test(t)) return parseFloat(t);
  return t;
}

/** Split `key: value` — at the FIRST `:` outside quotes that is followed by a space or line end. */
function splitKey(text: string): { key: string; rest: string } | null {
  let quote: string | null = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === '\\' && quote === '"') i++;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === ':' && (i + 1 === text.length || text[i + 1] === ' ')) {
      return { key: text.slice(0, i).trim(), rest: text.slice(i + 1).trim() };
    }
  }
  return null;
}

function parseBlock(lines: Line[], start: number, indent: number, where?: string): [YamlValue, number] {
  const first = lines[start];
  if (!first) return [null, start];

  // ── Block sequence ────────────────────────────────────────────────────────
  if (first.text === '-' || first.text.startsWith('- ')) {
    const arr: YamlValue[] = [];
    let i = start;
    while (i < lines.length && lines[i].indent === indent && (lines[i].text === '-' || lines[i].text.startsWith('- '))) {
      const line = lines[i];
      const rest = line.text.slice(1).trim();
      if (!rest) {
        // A bare `-`: the content is in the more-indented block below.
        const next = lines[i + 1];
        if (!next || next.indent <= indent) { arr.push(null); i++; continue; }
        const [v, ni] = parseBlock(lines, i + 1, next.indent, where);
        arr.push(v); i = ni; continue;
      }
      if (splitKey(rest)) {
        // The item is a map starting on the `- ` line itself. Rewrite that line as an ordinary
        // map line at column `indent + 2` and let the map branch below handle it — so there is
        // only ONE implementation of map parsing.
        const childIndent = indent + 2;
        const rewritten: Line[] = lines.slice();
        rewritten[i] = { indent: childIndent, text: rest, no: line.no };
        const [v, ni] = parseBlock(rewritten, i, childIndent, where);
        arr.push(v); i = ni; continue;
      }
      arr.push(parseScalar(rest, line.no, where));
      i++;
    }
    return [arr, i];
  }

  // ── Map ───────────────────────────────────────────────────────────────────
  const map: { [k: string]: YamlValue } = {};
  let i = start;
  while (i < lines.length && lines[i].indent === indent) {
    const line = lines[i];
    if (line.text === '-' || line.text.startsWith('- ')) break;
    const kv = splitKey(line.text);
    if (!kv) throw new YamlError(`not a \`key: value\` pair: ${JSON.stringify(line.text)}`, line.no, where);
    if (!kv.key) throw new YamlError('empty key', line.no, where);
    if (kv.key in map) throw new YamlError(`duplicate key \`${kv.key}\``, line.no, where);

    if (kv.rest) {
      map[kv.key] = parseScalar(kv.rest, line.no, where);
      i++;
      continue;
    }
    // The value lives in the block below. A block sequence is allowed to be indented level with
    // its parent key (YAML permits this), so the condition is `>` for maps and `>=` for sequences.
    const next = lines[i + 1];
    if (!next) { map[kv.key] = null; i++; continue; }
    const isSeq = next.text === '-' || next.text.startsWith('- ');
    if (next.indent > indent || (isSeq && next.indent === indent)) {
      const [v, ni] = parseBlock(lines, i + 1, next.indent, where);
      map[kv.key] = v; i = ni;
    } else {
      map[kv.key] = null; i++;
    }
  }
  if (i === start) throw new YamlError(`inconsistent indentation: ${JSON.stringify(lines[i].text)}`, lines[i].no, where);
  return [map, i];
}

/**
 * Parse a YAML document (the subset). Empty input ⇒ `{}` — that is "nothing declared", which is
 * valid. Every other syntax error throws a `YamlError`.
 */
/**
 * Parse the YAML subset.
 *
 * `firstLine` is the SOURCE line number of `src`'s first line. It exists because the caller that
 * matters — `parseDoc` — hands over the frontmatter with the opening `---` already stripped, so
 * without it every error would name a line one above the one you have to open.
 */
export function parseYaml(src: string, where?: string, firstLine = 1): YamlValue {
  const lines = scan(src, where, firstLine);
  if (!lines.length) return {};
  const base = lines[0].indent;
  const [value, end] = parseBlock(lines, 0, base, where);
  if (end < lines.length) {
    throw new YamlError(`inconsistent indentation: ${JSON.stringify(lines[end].text)}`, lines[end].no, where);
  }
  return value;
}

// ─── Serialize ──────────────────────────────────────────────────────────────
//
// ⚠️ This must be the INVERSE of `parseYaml` for every value DSpec writes, and a round-trip test
// locks that down. `ds map` writes `hash` into frontmatter of files the user owns; a
// serialiser that drops `facets` or changes a field's type would silently eat their words on
// every sync.

/** Does this string have to be quoted to read back as itself? */
function needsQuote(s: string): boolean {
  if (s === '') return true;
  if (s !== s.trim()) return true;
  if (/^(true|false|null|~)$/.test(s)) return true;
  if (/^-?\d+(\.\d+)?$/.test(s)) return true;
  // ⚠️ **The `#` rule here must be the exact mirror of `stripComment`, which opens a comment at a
  // `#` that is at the start of a line or PRECEDED by whitespace.** This used to test `#\s` —
  // a `#` FOLLOWED by whitespace — which is a different set entirely, so `RFC #6749` was emitted
  // unquoted and the next read silently truncated it to `RFC`. The user's own quotes were
  // stripped by `ds map --write` and half their sentence disappeared on the following parse:
  // exactly the "silently eat their words on every sync" failure this section warns about.
  if (/:\s|(^|\s)#|^[-?:,[\]{}#&*!|>'"%@`]|:$|\n/.test(s)) return true;
  return false;
}

function quote(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
}

function scalarOut(v: YamlValue): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean' || typeof v === 'number') return String(v);
  const s = String(v);
  return needsQuote(s) ? quote(s) : s;
}

const isScalar = (v: YamlValue): boolean => v === null || typeof v !== 'object';

/** "Empty" values are OMITTED from the output entirely — see `dumpYaml`. */
const isEmpty = (v: YamlValue): boolean =>
  v === null || v === undefined || v === '' ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0);

function emit(v: YamlValue, indent: number, out: string[]): void {
  const pad = ' '.repeat(indent);

  if (Array.isArray(v)) {
    // A short, all-scalar sequence ⇒ one flow line. Purely cosmetic, but the cosmetics here
    // decide whether frontmatter scans at a glance or becomes a 20-line column.
    if (v.every(isScalar)) {
      const flat = `[${v.map(scalarOut).join(', ')}]`;
      if (flat.length + indent <= 72) { out[out.length - 1] += ` ${flat}`; return; }
    }
    for (const item of v) {
      if (isScalar(item)) { out.push(`${pad}- ${scalarOut(item)}`); continue; }
      out.push(`${pad}-`);
      // The item is a map or sequence: build it at column +2, then fold the first line up after `- `.
      const sub: string[] = [];
      emit(item, indent + 2, sub);
      if (sub.length) {
        out[out.length - 1] = `${pad}- ${sub[0].slice(indent + 2)}`;
        for (const line of sub.slice(1)) out.push(line);
      }
    }
    return;
  }

  const obj = v as { [k: string]: YamlValue };
  for (const [k, val] of Object.entries(obj)) {
    if (isEmpty(val)) continue;
    if (isScalar(val)) { out.push(`${pad}${k}: ${scalarOut(val)}`); continue; }
    out.push(`${pad}${k}:`);
    emit(val, indent + 2, out);
  }
}

/**
 * Serialise to YAML — **dropping every empty key**.
 *
 * `codeRef: {}`, `actors: []` and `description: ""` carry nothing `parseYaml` could not infer
 * from their absence, and they bloat exactly the frontmatter a user reads every day. More
 * importantly: `codeRef: {}` reads as "an empty codeRef was declared" when the truth is "none was
 * declared" — those two must not look the same.
 */
export function dumpYaml(v: YamlValue): string {
  if (isEmpty(v)) return '';
  const out: string[] = [];
  emit(v, 0, out);
  return out.join('\n');
}
