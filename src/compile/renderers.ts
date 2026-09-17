// ============================================================
// The model → the files an agent actually reads
//
// Two artifacts, and the difference between them is the point:
//
//   `.ds/index.md`  the ENTRY POINT. Every feature, one line: what it is and where it lives.
//   `CLAUDE.md` /   a POINTER at that index, plus the product rules — one per agent family.
//   `AGENTS.md`     Claude Code reads the first; Codex and Cursor read the second.
//
// ⚠️ **The memory file is not a copy of the model.** Rendered from every element it would grow
// so it grew with the model — 88 KB for a model of a hundred elements — and every byte was billed
// to every agent call, on every turn. A pointer costs a few lines and sends the reader to the one
// file they need.
//
// ⚠️ **A renderer is a pure function, and its output is deterministic.** There is no generation
// timestamp: one changed line 1 of every artifact on every write, so a second `sync --write` left
// a dirty tree, the session brief reported dspec's own output as uncommitted work, and any two
// branches that synced were guaranteed to conflict on the same line.
//
// ⚠️ **A memory file somebody already wrote is never replaced.** `CLAUDE.md` and `AGENTS.md`
// usually exist before dspec does. Into those, only a MANAGED BLOCK is written — between
// `<!-- ds:begin -->` and `<!-- ds:end -->` — and nothing outside the markers is ever touched.
// ============================================================

import { byArea, summaryOf, type Model } from '../model/types';
import { FEATURES_DIR, INDEX_FILE, SPEC_DIR } from '../model/load';

export interface CompiledFile {
  /** Path relative to the repo root. */
  file: string;
  format: 'index' | 'memory';
  /** The whole file, as written when dspec owns it. */
  content: string;
  /** Memory files only: what goes between the markers of a file somebody else wrote. */
  block?: string;
}

/** The identity of one render run, stamped onto the files it produces. */
export interface ArtifactStamp {
  /** Which project produced this file — catches an artifact copied in from another repo. */
  projectId: string;
}

/**
 * Why the stamp has to exist: without it, a **generated** file and a **hand-written** one are two
 * files that look identical. People edit the very file the next render overwrites — losing their
 * words, with nothing to warn them. It is also what lets the check tell "stale" apart from "this
 * was never ours".
 */
export function parseArtifactStamp(content: string): { projectId: string; legacy: boolean } | null {
  const m = /<!--\s*ds:\s*project=("(?:[^"\\]|\\.)*"|\S+)/.exec(content.slice(0, 512));
  if (!m) return null;
  if (!m[1].startsWith('"')) return { projectId: m[1], legacy: true };
  try {
    return { projectId: JSON.parse(m[1]) as string, legacy: false };
  } catch {
    return null;
  }
}

/**
 * Was this stamp written by the project named `name`?
 *
 * ⚠️ **A legacy stamp is unquoted**, and `project=Acme Shop` was read back as `Acme` — so every
 * artifact of a product whose name has a space was reported as foreign, forever, and
 * `sync --strict` could never pass. Old stamps are matched on the first word so those repos
 * recover on the next write instead of being told their own files were copied in.
 */
export function stampMatches(stamp: { projectId: string; legacy: boolean }, name: string): boolean {
  if (!stamp.legacy) return stamp.projectId === name;
  return stamp.projectId === name || stamp.projectId === name.split(/\s/)[0];
}

const stampLine = (p: ArtifactStamp): string => `<!-- ds: project=${JSON.stringify(p.projectId)} -->`;

/** Drop what a legacy stamp carried and the current one does not: the line itself. */
export function withoutStamp(s: string): string {
  return s.replace(/^<!--\s*ds:\s*project=.*-->\n?/, '');
}

// ─── the managed block ──────────────────────────────────────────────────────

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
 * What to write for `file`, given what is on disk now.
 *
 * - nothing on disk, or a file dspec stamped ⇒ the whole rendered file;
 * - a file somebody else wrote, with a block ⇒ that block replaced, every other byte kept;
 * - a file somebody else wrote, without one ⇒ the block appended, every existing byte kept.
 *
 * ⚠️ The index lives inside `.ds/` and is always dspec's; only memory files carry a block.
 */
export function materialise(file: CompiledFile, existing: string | null): string {
  if (existing === null || file.block === undefined || parseArtifactStamp(existing)) return file.content;
  const current = extractBlock(existing);
  if (current !== null) return existing.replace(current, () => file.block!.replace(/\n$/, ''));
  const kept = existing.replace(/\s+$/, '');
  return kept ? `${kept}\n\n${file.block}` : file.block;
}

// ─── `.ds/index.md` ─────────────────────────────────────────────────────────

/**
 * The index — one read that answers *what* and *where* for the whole product.
 *
 * ⚠️ **Areas are ordered alphabetically, not by appearance.** A reader returning to this file must
 * find a feature where they left it; ordering by whatever the directory walk happened to return
 * would move headings around whenever a file is renamed.
 */
export function renderIndex(model: Model, p: ArtifactStamp): CompiledFile {
  const lines: string[] = [
    stampLine(p),
    `# ${model.product.name} — product index`,
    '',
    'Every feature in this product: what it is, where it lives, and what it depends on.',
    `Generated from \`${SPEC_DIR}/${FEATURES_DIR}/\` — do not edit by hand.`,
    '',
  ];

  const groups = [...byArea(model.features).entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [area, features] of groups) {
    lines.push(`## ${area || 'No area'}`, '');
    for (const f of features) {
      const summary = summaryOf(f);
      lines.push(`- **${f.name}**${summary ? ` — ${summary}` : ''}`);
      const where = f.code.map((c) => `\`${c}\``).join(', ');
      const uses = f.uses.length ? ` · uses: ${f.uses.join(', ')}` : '';
      lines.push(`  → ${where}${uses}`);
    }
    lines.push('');
  }

  if (!model.features.length) {
    lines.push('_No features described yet. Run `dspec sync --write` to scaffold from the code._', '');
  }

  return { file: `${SPEC_DIR}/${INDEX_FILE}`, format: 'index', content: lines.join('\n').replace(/\n+$/, '\n') };
}

// ─── the memory file ────────────────────────────────────────────────────────

/**
 * The pointer an agent reads at the start of a session.
 *
 * It carries the product rules and nothing else from the model, because those are the only lines
 * that apply to every change. Everything else is one lookup away, and a lookup that costs one file
 * read is cheaper than a copy that costs every turn.
 *
 * ⚠️ **`sessionStart` is the whole difference between the two files.** Claude Code runs a
 * SessionStart hook that briefs it on what the model owes. Codex and Cursor cannot run a command
 * on a session event at all, so `AGENTS.md` has to ASK them to run it. An instruction is weaker
 * than a hook — it can simply be skipped — and it is written as an instruction rather than dressed
 * up as the same guarantee.
 */
export function renderMemoryFile(
  model: Model,
  p: ArtifactStamp,
  file: string,
  sessionStart: boolean,
): CompiledFile {
  const whole: string[] = [
    stampLine(p),
    `# ${model.product.name}`,
    '',
    ...memoryBody(model, sessionStart, '##'),
    '---',
    '',
    '_Generated from the model by `dspec sync`. Never edit this file by hand — it is overwritten._',
    '',
  ];
  const block: string[] = [
    BLOCK_BEGIN,
    `## ${model.product.name} — product model (dspec)`,
    '',
    '_Maintained by `dspec sync` — the text between the `ds:begin` and `ds:end` markers is',
    'rewritten from `.ds/`; everything outside them is yours and is never touched._',
    '',
    ...memoryBody(model, sessionStart, '###'),
    BLOCK_END,
    '',
  ];

  return {
    file,
    format: 'memory',
    content: whole.join('\n').replace(/\n+$/, '\n'),
    block: block.join('\n').replace(/\n{3,}/g, '\n\n'),
  };
}

/** What a memory file says, whether it owns the file or only a block inside somebody else's. */
function memoryBody(model: Model, sessionStart: boolean, h: string): string[] {
  const lines: string[] = [
    `This project keeps an internal product model in \`${SPEC_DIR}/\`, and you maintain it. The user`,
    'never reads or edits it: talk to them about features and behaviour, never about these files.',
    '',
    `**Start at \`${SPEC_DIR}/${INDEX_FILE}\`** — every feature, what it is, and which files it`,
    'lives in. Then read the one feature file you need; do not read the whole model, and do not',
    'read this file to find out what a feature does.',
    '',
  ];

  if (model.product.vision.trim()) lines.push(model.product.vision.trim(), '');

  if (model.product.rules.length) {
    lines.push(`${h} Rules`, '', '_Non-negotiable, and they apply to every change._', '');
    lines.push(...model.product.rules);
    lines.push('');
  }

  // ⚠️ **The one instruction that makes the model maintain itself**, carried by every agent's memory
  // file. Claude Code's Stop hook enforces it; for agents with no hook, this paragraph is the whole
  // mechanism, and it is written as an instruction rather than dressed up as a guarantee.
  lines.push(
    `${h} Keeping the product model current`,
    '',
    'After any work that changed code — yours or anyone else\'s — and before you finish, without',
    'asking the user:',
    '',
    '1. `dspec sync` lists what the model owes.',
    '2. For each description older than its code: read the code and the description, rewrite the',
    '   description so it is true of the code now, then `dspec accept "<Feature>"`.',
    '3. For a claimed file that is gone, or code no feature claims: fix that feature\'s `code:`, or',
    '   add a feature named for what it does for the product. Run `dspec sync --guide` before',
    `   writing anything under \`${SPEC_DIR}/\`.`,
    '4. For a feature with no description: read its files and write one.',
    '5. `dspec sync --write`, then `dspec sync --strict` until it is clean.',
    '6. Tell the user in one line which features you updated.',
    '',
  );

  if (sessionStart) {
    lines.push(
      `${h} At the start of a session`,
      '',
      'Run `dspec sync --brief` and read what it says before touching anything. This agent cannot',
      'run a command on a session event, so nothing does this for you — which also means nothing',
      'will stop you working from a description that is older than its code.',
      '',
      'Then `dspec spec "<Feature name>"` for the work in hand. It resolves NAMES, so if it says',
      'the model does not name your request, pick from the list it prints rather than going',
      'hunting through the source.',
      '',
    );
  }

  return lines;
}

/**
 * Every artifact this model renders to. One list, so nothing can render a file the check forgets.
 *
 * ⚠️ `memoryFiles` is passed IN, derived by the caller from what is on disk (`install/agents.ts`).
 * Reading the filesystem here would stop this module being a pure function of the model, and a
 * pure function is exactly what lets the freshness check re-render and compare.
 */
export function renderAll(model: Model, p: ArtifactStamp, memoryFiles: string[] = ['CLAUDE.md']): CompiledFile[] {
  return [
    renderIndex(model, p),
    // `CLAUDE.md` is the one file with a hook behind it; every other agent's needs the paragraph.
    ...memoryFiles.map((f) => renderMemoryFile(model, p, f, f !== 'CLAUDE.md')),
  ];
}
