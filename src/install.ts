// ============================================================
// Writing dspec's own files into somebody else's repository
//
// ⚠️ **Ownership is a MARK, not a name.** `ds-bootstrap` is short enough that a user or another
// tool may already have a file by a similar name. Everything dspec installs therefore carries
// `dspec:managed`, and `dspec init` deletes only what carries it — plus the few paths an older
// dspec wrote before the mark existed, recognised by their old prefix or their content.
//
// ⚠️ **Every run deletes the whole install and writes it again.** That is what makes an upgrade
// clean: nothing out of date survives, and nothing a newer version dropped is left behind. The
// add-only rule this replaced meant no improvement ever reached anybody who already had a copy.
//
// ⚠️ **A memory file is never replaced.** `CLAUDE.md` and `AGENTS.md` usually exist before dspec
// does. Only the block between `ds:begin` and `ds:end` is dspec's; every other byte is the
// user's and is passed through untouched.
// ============================================================

import * as fs from 'node:fs';
import * as path from 'node:path';

/** Carried by every file dspec installs. `dspec init` deletes only what carries it. */
export const MANAGED_MARK = 'dspec:managed';

// ─── ownership ──────────────────────────────────────────────────────────────

/** Does this file (or this skill directory's `SKILL.md`) carry dspec's mark? */
export function isManaged(p: string): boolean {
  try {
    const file = fs.statSync(p).isDirectory() ? path.join(p, 'SKILL.md') : p;
    return fs.readFileSync(file, 'utf-8').includes(MANAGED_MARK);
  } catch {
    return false;
  }
}

/** Entries of `dir` named `ds` / `ds-*` (optionally ending in `suffix`) that carry the mark. */
export function managed(dir: string, suffix = ''): string[] {
  let names: string[];
  try { names = fs.readdirSync(dir); } catch { return []; }
  return names
    .filter((n) => n.endsWith(suffix) && (n.slice(0, n.length - suffix.length) === 'ds' || n.startsWith('ds-')))
    .map((n) => path.join(dir, n))
    .filter(isManaged);
}

/** 0.0.2 and 0.0.3 installed under this prefix, which nothing else uses. Removed by name. */
const OLD_PREFIX = 'dspec';

/** Entries of `dir` from the 0.0.2 – 0.0.3 install: `dspec-*` (with `suffix`) or exactly `dspec`. */
export function oldPrefixed(dir: string, suffix = ''): string[] {
  let names: string[];
  try { names = fs.readdirSync(dir); } catch { return []; }
  return names
    .filter((n) => (n.startsWith(`${OLD_PREFIX}-`) && n.endsWith(suffix)) || n === OLD_PREFIX)
    .map((n) => path.join(dir, n));
}

/**
 * Did dspec write this? Asked only of LEGACY paths, whose names (`stop.js`, `ds-sync.md`) a user
 * or another tool could also have chosen. Every file dspec ever shipped names dspec, its model
 * directory `.ds/`, one of its own `/ds-*` commands, or loads its hook helper — a file that does
 * none of those is somebody else's and is kept.
 *
 * ⚠️ **"names dspec" alone is not enough.** 0.0.1's `ds-plan` prompt, once Codex and Cursor had
 * dropped its tool list, never says "dspec": it only points at `/ds-spec`. It survived the
 * upgrade as a stale command until the other signals were added.
 */
function writtenByDspec(p: string): boolean {
  try {
    const file = fs.statSync(p).isDirectory() ? path.join(p, 'SKILL.md') : p;
    return /dspec|\.ds\/|\/ds-(?:spec|plan|sync|bootstrap|update)\b|require\('\.\/_ds'\)/i
      .test(fs.readFileSync(file, 'utf-8'));
  } catch {
    return false;
  }
}

/** Legacy paths that exist, carry no mark, and are recognisably dspec's. */
export const existingLegacy = (paths: string[]): string[] =>
  paths.filter((p) => fs.existsSync(p) && !isManaged(p) && writtenByDspec(p));

/** Mark an installed file. Markdown takes an HTML comment no agent renders. */
export const withMark = (content: string): string =>
  `${content.replace(/\n*$/, '\n')}\n<!-- ${MANAGED_MARK} -->\n`;

// ─── writing ────────────────────────────────────────────────────────────────

/** A file an adapter intends to write. `path` is repo-relative, or absolute for `~/.codex`. */
export interface PlannedFile {
  path: string;
  content: string;
  agent: string;
}

/** What one agent's rebuild did, as paths the user can recognise. */
export interface Rebuilt {
  agent: string;
  /** Written, and not there before. */
  added: string[];
  /** Written over a copy dspec had put there before. */
  updated: string[];
  /** Removed and not written again — a file from an older dspec, or an agent no longer chosen. */
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
 * `occupied` is what the agent owns now plus what an older dspec left — see `Agent.owned` and
 * `Agent.legacy`. Pass an empty `planned` to uninstall.
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

// ─── the memory-file block ──────────────────────────────────────────────────

export const BLOCK_BEGIN = '<!-- ds:begin -->';
export const BLOCK_END = '<!-- ds:end -->';

/** The text between the markers, markers included — or null when the file has no block. */
export function extractBlock(content: string): string | null {
  const start = content.indexOf(BLOCK_BEGIN);
  if (start < 0) return null;
  const end = content.indexOf(BLOCK_END, start);
  if (end < 0) return null;
  return content.slice(start, end + BLOCK_END.length);
}

/**
 * Was this whole file generated by dspec 0.1.x?
 *
 * ⚠️ That version rendered `CLAUDE.md` in its entirety — product rules, feature index, the lot —
 * and stamped the first line. None of such a file is the user's, so it is replaced outright
 * rather than having a block appended to prose the new dspec no longer maintains.
 */
const isLegacyArtifact = (content: string): boolean => /^<!--\s*ds:\s*project=/.test(content.trimStart());

export type BlockOutcome = 'created' | 'replaced' | 'appended' | 'migrated' | 'unchanged';

/**
 * Put `block` into a memory file, and touch nothing else in it.
 *
 * - absent ⇒ the file is created holding the block;
 * - it has the markers ⇒ what is between them is replaced, every other byte kept;
 * - it is a 0.1.x artifact ⇒ replaced whole (see `isLegacyArtifact`);
 * - anything else ⇒ the block is appended, every existing byte kept.
 */
export function writeMemoryBlock(file: string, block: string): BlockOutcome {
  const body = block.replace(/\n*$/, '\n');
  let existing: string | null = null;
  try { existing = fs.readFileSync(file, 'utf-8'); } catch { /* absent — created below */ }

  let next: string;
  let outcome: BlockOutcome;
  if (existing === null) {
    next = body;
    outcome = 'created';
  } else if (isLegacyArtifact(existing)) {
    next = body;
    outcome = 'migrated';
  } else {
    const current = extractBlock(existing);
    if (current !== null) {
      next = existing.replace(current, () => block.replace(/\n$/, ''));
      outcome = 'replaced';
    } else {
      const kept = existing.replace(/\s+$/, '');
      next = kept ? `${kept}\n\n${body}` : body;
      outcome = 'appended';
    }
  }

  if (existing !== null && next === existing) return 'unchanged';
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, next, 'utf-8');
  return outcome;
}

// ─── cleaning up what 0.1.x left in `settings.json` ─────────────────────────

export type HooksOutcome =
  | { ok: true; changed: boolean }
  /** The file is there and cannot be parsed ⇒ nothing was written. */
  | { ok: false; detail: string };

type HookEntry = { command?: unknown; [k: string]: unknown };
type HookGroup = { hooks?: HookEntry[]; [k: string]: unknown };

/**
 * Remove dspec's own hook entries from a Claude `settings.json`, and nothing else.
 *
 * ⚠️ **dspec installs no hooks any more, but 0.1.x did** — three entries pointing at scripts this
 * version deletes. Left behind, every session would start by failing to run a file that is not
 * there. Cleaning up after ourselves is part of owning what carries our mark; the file is never
 * created, never gains anything, and is left byte-identical when it holds none of our entries.
 *
 * On a file that does not parse, NOTHING is written: one stray comma must never cost somebody
 * their whole configuration.
 */
export function removeHooks(file: string, isOurs: (command: string) => boolean): HooksOutcome {
  let raw: string;
  try {
    raw = fs.readFileSync(file, 'utf-8');
  } catch {
    return { ok: true, changed: false }; // absent — nothing of ours can be in it
  }
  if (!raw.trim()) return { ok: true, changed: false };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message.split('\n')[0] : String(err) };
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, detail: 'not a JSON object' };
  }
  const current = parsed as Record<string, unknown>;
  const existing = current.hooks;
  if (existing === undefined) return { ok: true, changed: false };
  if (existing === null || typeof existing !== 'object' || Array.isArray(existing)) {
    return { ok: false, detail: '`hooks` is not an object' };
  }

  const hooks: Record<string, HookGroup[]> = {};
  let removedAny = false;
  for (const [event, groups] of Object.entries(existing as Record<string, unknown>)) {
    if (!Array.isArray(groups)) { hooks[event] = groups as HookGroup[]; continue; }
    const kept: HookGroup[] = [];
    let removedHere = false;
    for (const g of groups as HookGroup[]) {
      if (!g || !Array.isArray(g.hooks)) { kept.push(g); continue; }
      const entries = g.hooks.filter((h) => !(typeof h?.command === 'string' && isOurs(h.command)));
      if (entries.length === g.hooks.length) { kept.push(g); continue; }
      removedHere = true;
      removedAny = true;
      // A matcher group emptied BY THAT removal is dropped; one that was already empty is the
      // user's and stays.
      if (entries.length) kept.push({ ...g, hooks: entries });
    }
    if (kept.length || !removedHere) hooks[event] = kept;
  }

  // ⚠️ **Nothing of ours found ⇒ the file is not rewritten at all.** Re-serialising it would
  // reformat somebody's four-space indentation into two and reorder nothing for no reason — a
  // diff in a committed file that dspec had no business making.
  if (!removedAny) return { ok: true, changed: false };

  const next: Record<string, unknown> = { ...current };
  // A `hooks: {}` the user wrote is theirs; only a block emptied by removing dspec's entries goes.
  const userEmpty = !Object.keys(existing as object).length;
  if (Object.keys(hooks).length || userEmpty) next.hooks = hooks;
  else delete next.hooks;

  fs.writeFileSync(file, JSON.stringify(next, null, 2) + '\n', 'utf-8');
  return { ok: true, changed: true };
}
