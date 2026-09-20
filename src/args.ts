// ============================================================
// Flag parsing — a thin, strict wrapper around `node:util.parseArgs`
//
// ⚠️ **Strict, always.** A mistyped flag must be an error. `--stirct` once passed silently
// through an `args.includes` check, and a CI job was green because of it.
// ============================================================

import { parseArgs, type ParseArgsConfig } from 'node:util';

export interface FlagSpec {
  [name: string]: { type: 'string' | 'boolean'; short?: string; multiple?: boolean };
}

export interface Parsed<T> {
  values: T;
  positionals: string[];
}

export function parseFlags<T = Record<string, unknown>>(args: string[], options: FlagSpec): Parsed<T> {
  const cfg: ParseArgsConfig = {
    args,
    options: options as ParseArgsConfig['options'],
    allowPositionals: true,
    strict: true,
  };
  try {
    const { values, positionals } = parseArgs(cfg);
    return { values: values as T, positionals: positionals as string[] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // `parseArgs` appends a long `--help` suggestion; the first line names the bad flag, which
    // is the whole of what the reader needs.
    throw new Error(msg.split('\n')[0].replace(/\. To specify a positional argument.*$/, ''));
  }
}

/** `--agent claude,codex` or `--agent claude --agent codex` → `['claude','codex']`, deduplicated. */
export function csv(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  const raw = Array.isArray(value) ? value : [value];
  const out: string[] = [];
  for (const chunk of raw) {
    for (const part of String(chunk).split(',')) {
      const v = part.trim();
      if (v && !out.includes(v)) out.push(v);
    }
  }
  return out;
}
