// ============================================================
// Writing files into somebody else's repository
//
// ⚠️ **One rule, and it has no exceptions: add what is absent, never touch what is there.**
// Not a file, not a key, not a line. A file that already exists is left byte-for-byte alone
// whoever wrote it — dspec included.
//
// This is deliberately weaker than the manifest-and-sha scheme that used to live here. That one
// could tell "the user edited this" from "this is still ours" and overwrite the second kind
// safely. It was correct, and it was still a machine deciding to replace a file in a repository
// it does not own. The cost of dropping it is real and is stated where the user can see it: an
// improved `ds-sync.md` never reaches somebody who already has one, unless they delete theirs
// first. That cost is preferable to the failure in the other direction, which is silent and
// unrecoverable.
//
// The one thing that is not create-or-skip is a JSON settings file, because dspec has to ADD a
// key to a file the user owns — see `mergeJson`. It still adds only what is missing, and on a
// parse failure it writes NOTHING AT ALL: one stray comma must never cost somebody their whole
// configuration.
// ============================================================

import * as fs from 'node:fs';
import * as path from 'node:path';

/** A file an adapter intends to write. `path` is repo-relative, or absolute for `~/.codex`. */
export interface PlannedFile {
  path: string;
  content: string;
  agent: string;
  /** Hook scripts want the executable bit on Unix. */
  executable?: boolean;
}

export type Verdict =
  /** Was not there; written. */
  | 'added'
  /** Was there; untouched, whoever wrote it. */
  | 'left alone';

export interface Applied {
  path: string;
  agent: string;
  verdict: Verdict;
}

function resolve(repo: string, p: string): string {
  return path.isAbsolute(p) ? p : path.join(repo, ...p.split('/'));
}

/**
 * Write every planned file that does not exist yet.
 *
 * There is no `force` parameter and there must not be one. A flag that turns the rule off is a
 * flag somebody passes habitually, and then the rule protects nobody.
 */
export function addFiles(repo: string, planned: PlannedFile[]): Applied[] {
  const out: Applied[] = [];
  for (const f of planned) {
    const abs = resolve(repo, f.path);
    if (fs.existsSync(abs)) {
      out.push({ path: f.path, agent: f.agent, verdict: 'left alone' });
      continue;
    }
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, f.content, 'utf-8');
    if (f.executable) {
      try {
        fs.chmodSync(abs, 0o755);
      } catch {
        /* Windows, or a filesystem without the bit — hooks still run via `node <file>` */
      }
    }
    out.push({ path: f.path, agent: f.agent, verdict: 'added' });
  }
  return out;
}

export type MergeOutcome =
  | { ok: true; changed: boolean }
  /** The file is there and cannot be parsed ⇒ nothing was written. */
  | { ok: false; detail: string };

/**
 * Add top-level keys to a JSON file, keeping everything already in it.
 *
 * ⚠️ **A key that already exists is never replaced.** If the user has their own `hooks` block,
 * theirs wins and dspec says so — the same rule as `addFiles`, applied one level deeper.
 *
 * ⚠️ **On a parse failure, write nothing.** The file belongs to the user. Rewriting a settings
 * file we could not read would replace configuration we never saw.
 */
export function mergeJson(file: string, add: Record<string, unknown>): MergeOutcome {
  let raw: string | null = null;
  try {
    raw = fs.readFileSync(file, 'utf-8');
  } catch {
    /* absent is fine — this is the first install */
  }

  let current: Record<string, unknown> = {};
  if (raw !== null && raw.trim()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      return { ok: false, detail: err instanceof Error ? err.message.split('\n')[0] : String(err) };
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, detail: 'not a JSON object' };
    }
    current = parsed as Record<string, unknown>;
  }

  const missing = Object.keys(add).filter((k) => !Object.prototype.hasOwnProperty.call(current, k));
  if (!missing.length) return { ok: true, changed: false };

  const next = { ...current };
  for (const k of missing) next[k] = add[k];
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(next, null, 2) + '\n', 'utf-8');
  return { ok: true, changed: true };
}
