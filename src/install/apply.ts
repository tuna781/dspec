// ============================================================
// Writing dspec's own files into somebody else's repository
//
// ⚠️ **dspec owns exactly what carries its prefix, and rebuilds exactly that.** `dspec init` is how
// a user installs dspec into their agents and how they take a newer version: it deletes every
// `dspec`-prefixed command, skill and hook, and every hook entry pointing at them, then writes them
// again from the dspec that is installed now. An upgrade therefore leaves nothing stale — no
// out-of-date prose, no command that was removed upstream.
//
// The add-only rule this replaced protected files dspec wrote from dspec itself, and the cost was
// that no improvement ever reached anybody who already had a copy. The protection that matters is
// kept, and made checkable from the checkout: **nothing without the prefix is ever written or
// removed**, and neither is any part of `settings.json` that is not one of dspec's own hook entries.
//
// On a `settings.json` that does not parse, NOTHING is written: one stray comma must never cost
// somebody their whole configuration.
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

/** What one agent's rebuild did, as paths the user can recognise. */
export interface Rebuilt {
  agent: string;
  /** Written, and not there before. */
  added: string[];
  /** Written over a copy dspec had put there before. */
  updated: string[];
  /** Removed and not written again — stale files from an older dspec, or an agent no longer chosen. */
  removed: string[];
}

export function resolvePath(repo: string, p: string): string {
  return path.isAbsolute(p) ? p : path.join(repo, ...p.split('/'));
}

/** Every file under `p` (or `p` itself), as absolute paths. */
function filesUnder(p: string): string[] {
  let st: fs.Stats;
  try { st = fs.lstatSync(p); } catch { return []; }
  if (!st.isDirectory()) return [p];
  return fs.readdirSync(p).flatMap((n) => filesUnder(path.join(p, n)));
}

/**
 * Delete everything one agent's install occupies, then write `planned`.
 *
 * `occupied` is what the agent owns now plus what an older dspec left without a prefix — see
 * `Agent.owned` and `Agent.legacy`. Pass an empty `planned` to uninstall.
 */
export function rebuild(repo: string, agent: string, occupied: string[], planned: PlannedFile[]): Rebuilt {
  const before = new Set(occupied.flatMap(filesUnder));
  // The parent directories are left in place: `.claude/commands/` is the user's as much as dspec's.
  for (const p of occupied) fs.rmSync(p, { recursive: true, force: true });

  const written = new Set<string>();
  for (const f of planned) {
    const abs = resolvePath(repo, f.path);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, f.content, 'utf-8');
    if (f.executable) {
      try {
        fs.chmodSync(abs, 0o755);
      } catch {
        /* Windows, or a filesystem without the bit — hooks still run via `node <file>` */
      }
    }
    written.add(abs);
  }

  const show = (abs: string) => (abs.startsWith(repo + path.sep) ? path.relative(repo, abs).split(path.sep).join('/') : abs);
  return {
    agent,
    added: [...written].filter((p) => !before.has(p)).map(show),
    updated: [...written].filter((p) => before.has(p)).map(show),
    removed: [...before].filter((p) => !written.has(p)).map(show),
  };
}

export type HooksOutcome =
  | { ok: true; changed: boolean }
  /** The file is there and cannot be parsed ⇒ nothing was written. */
  | { ok: false; detail: string };

type HookEntry = { command?: unknown; [k: string]: unknown };
type HookGroup = { hooks?: HookEntry[]; [k: string]: unknown };

/**
 * Replace dspec's own entries in a Claude `settings.json` `hooks` block, and nothing else.
 *
 * - Every entry whose `command` is one dspec writes (`isOurs`) is removed, from every event.
 * - A matcher group or an event left empty BY THAT removal is dropped; one that was already empty
 *   is the user's and stays.
 * - `add` is then appended, so the user's own hooks keep their position and run first.
 * - Every other key in the file is kept, and the file is written only when something changed.
 *
 * Pass `add = {}` to remove dspec's hooks entirely.
 */
export function replaceHooks(
  file: string,
  add: Record<string, HookGroup[]>,
  isOurs: (command: string) => boolean,
): HooksOutcome {
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

  const existing = current.hooks;
  if (existing !== undefined && (existing === null || typeof existing !== 'object' || Array.isArray(existing))) {
    return { ok: false, detail: '`hooks` is not an object' };
  }

  const hooks: Record<string, HookGroup[]> = {};
  for (const [event, groups] of Object.entries((existing ?? {}) as Record<string, unknown>)) {
    if (!Array.isArray(groups)) { hooks[event] = groups as HookGroup[]; continue; }
    const kept: HookGroup[] = [];
    let removedHere = false;
    for (const g of groups as HookGroup[]) {
      if (!g || !Array.isArray(g.hooks)) { kept.push(g); continue; }
      const entries = g.hooks.filter((h) => !(typeof h?.command === 'string' && isOurs(h.command)));
      if (entries.length === g.hooks.length) { kept.push(g); continue; }
      removedHere = true;
      if (entries.length) kept.push({ ...g, hooks: entries });
    }
    if (kept.length || !removedHere) hooks[event] = kept;
  }
  for (const [event, groups] of Object.entries(add)) {
    hooks[event] = [...(hooks[event] ?? []), ...groups];
  }

  const next: Record<string, unknown> = { ...current };
  // A `hooks: {}` the user wrote is theirs; only a block emptied by removing dspec's entries goes.
  const userEmpty = existing !== undefined && !Object.keys(existing as object).length;
  if (Object.keys(hooks).length || userEmpty) next.hooks = hooks;
  else delete next.hooks;

  const out = JSON.stringify(next, null, 2) + '\n';
  if (raw !== null && out === raw) return { ok: true, changed: false };
  if (raw === null && !Object.keys(add).length) return { ok: true, changed: false };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, out, 'utf-8');
  return { ok: true, changed: true };
}
