import { parseArgs, type ParseArgsConfig } from 'node:util';

/**
 * A wrapper around `node:util.parseArgs` for the NEWER commands (`init`, `upgrade`, `doctor`,
 * `feature`).
 *
 * ⚠️ **Do not touch `argValue` in `commands/compile.ts`.** The older commands (`compile`,
 * `delta`, `map`, `drift`) read argv through it and have tests around them; moving them to a
 * new parser is a refactor nobody asked for, carrying the risk of behaviour changes somewhere
 * unrelated. The two parsers coexist until there is a real reason to merge them.
 *
 * The only difference from bare `parseArgs`: `strict` is on, and errors are reduced to one
 * short line with no stack trace — `main()` prints `✗ <message>`, so the message must stand
 * on its own.
 */
export type FlagType = 'string' | 'boolean';

export interface FlagSpec {
  [name: string]: { type: FlagType; short?: string; multiple?: boolean; default?: string | boolean };
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
    // `parseArgs` throws a long message with a `--help` suggestion appended; the first line
    // is enough to identify which flag was mistyped.
    throw new Error(msg.split('\n')[0]);
  }
}

/** `--touch A/x,B/y` or `--touch A/x --touch B/y` → `['A/x','B/y']`, deduplicated. */
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
