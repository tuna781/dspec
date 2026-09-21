// ============================================================
// `dspec init` — install dspec into your agents, and rebuild that install on every run
//
// The terminal has exactly one job: put the `/ds-bootstrap` command and the map instructions into
// every agent dspec supports. Everything else happens inside an agent session.
//
// ⚠️ **It asks nothing.** `dspec init` installs for all three agents, every time. A picker made the
// user answer a question they had no way to answer well — which agents they might use on this repo,
// this month, on this machine and every teammate's — to save a few kilobytes of markdown. Getting
// it wrong meant a session where the command simply was not there, with nothing to explain why.
// `--agent` is still there for somebody who genuinely wants one, and nobody has to find it.
//
// ⚠️ **Every run deletes everything dspec installed, then writes it again.** Ownership is the
// `dspec:managed` mark — see `install.ts` — plus the files an older dspec wrote before the mark
// existed. So after `npm i -g dspec@latest`, one `dspec init` leaves the repo holding exactly what
// the new version ships: nothing out of date, nothing a newer version dropped. Nothing without
// dspec's mark is touched.
//
// ⚠️ **It does not create the model, and it does not read one.** `.ds/` is written by an agent
// running `/ds-bootstrap`, which is the only thing that can read a codebase and judge it. Keeping
// them apart matters: "set the tooling up" and "read and describe my whole product" are different
// intentions, and one must not silently carry the other's power.
// ============================================================

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  AGENTS, AGENT_KEYS, INVOKE, isAgentKey, isInstalled, legacyHookCommands, type AgentKey,
} from './agents';
import { rebuild, removeHooks, writeMemoryBlock, type PlannedFile, type Rebuilt } from './install';
import { packageRoot, packageVersion } from './pkgRoot';
import { csv, parseFlags } from './args';

const USAGE = `dspec init [--agent claude,codex,cursor]

  Install dspec into every AI coding agent it supports — Claude Code, Codex CLI and Cursor: the
  ${INVOKE} command, and the instructions that teach the agent to use \`.ds/\` in
  CLAUDE.md / AGENTS.md. It asks nothing.

  Every run REBUILDS the install: everything dspec wrote before is deleted and written again from
  this version. Run it after upgrading. Nothing dspec did not write is ever touched.

  --agent   install for these only, comma separated. An agent left out is not touched —
            \`--agent\` adds, it never uninstalls`;

interface InitFlags {
  agent?: string | string[];
  help?: boolean;
}

export async function cmdInit(argv: string[]): Promise<number> {
  const { values } = parseFlags<InitFlags>(argv, {
    agent: { type: 'string', multiple: true },
    help: { type: 'boolean', short: 'h' },
  });

  if (values.help) {
    console.log(USAGE);
    return 0;
  }

  const repo = process.cwd();
  const installed = AGENT_KEYS.filter((k) => isInstalled(AGENTS[k], repo));

  // ---- which agents ----------------------------------------------------
  const named = csv(values.agent);
  const unknown = named.filter((n) => !isAgentKey(n));
  if (unknown.length) {
    console.error(`✗ no such agent: ${unknown.join(', ')}\n\n${USAGE}`);
    return 2;
  }

  // ⚠️ **All three unless told otherwise, and the same answer in a terminal, a script and CI.**
  // Installing an agent somebody never opens costs them one markdown file; NOT installing the one
  // they do open costs them a session where `/ds-bootstrap` is missing and nothing says why. The
  // two mistakes are not the same size, so the default is the cheap one.
  const chosen: AgentKey[] = named.length ? named.filter(isAgentKey) : [...AGENT_KEYS];

  const templates = path.join(packageRoot(), 'templates');
  const memoryTemplate = path.join(templates, 'memory.md');
  if (!fs.existsSync(memoryTemplate)) {
    console.error(`✗ this dspec has no \`templates/\` at ${templates} — the install is incomplete`);
    return 2;
  }

  // ---- plan everything before deleting anything ------------------------
  // A template that cannot be read must not leave an agent with its old install deleted and no
  // new one written.
  const plans = new Map<AgentKey, PlannedFile[]>();
  let block: string;
  try {
    block = fs.readFileSync(memoryTemplate, 'utf-8').trim();
    for (const key of chosen) plans.set(key, AGENTS[key].plan({ repo, templates }));
  } catch (err) {
    console.error(`✗ could not read the templates — ${err instanceof Error ? err.message : String(err)}`);
    return 2;
  }

  // ---- rebuild ---------------------------------------------------------
  const results: Rebuilt[] = [];
  for (const key of AGENT_KEYS) {
    const agent = AGENTS[key];
    const planned = plans.get(key);
    // ⚠️ **Not naming an agent is not a request to uninstall it.** `--agent` only ever adds.
    // Removing what was left out made a flag that reads as "install these" delete somebody's
    // other install as a side effect, with the only warning in `--help`. Uninstalling is a
    // separate intention and has to be asked for separately.
    if (!planned) continue;
    results.push(rebuild(repo, key, [...agent.owned(repo), ...agent.legacy(repo)], planned));
  }

  // ---- the memory files ------------------------------------------------
  const memory: { file: string; outcome: string }[] = [];
  for (const file of [...new Set(chosen.map((k) => AGENTS[k].memoryFile))]) {
    memory.push({ file, outcome: writeMemoryBlock(path.join(repo, file), block) });
  }

  // ---- take back what 0.1.x left in settings.json ----------------------
  const notes: string[] = [];
  const ours = new Set(legacyHookCommands());
  const settings = path.join(repo, '.claude', 'settings.json');
  const outcome = removeHooks(settings, (c) => ours.has(c));
  if (!outcome.ok) {
    notes.push(
      `.claude/settings.json could not be parsed (${outcome.detail}) — it was NOT written to.\n`
      + '    If it still holds dspec hook entries from an older version, remove them by hand:\n'
      + '    the scripts they point at no longer exist.',
    );
  } else if (outcome.changed) {
    notes.push('removed the session hooks an older dspec had added to .claude/settings.json.');
  }

  report(installed.filter((k) => !chosen.includes(k)), results, memory, notes);
  return 0;
}

function report(
  untouched: AgentKey[],
  results: Rebuilt[],
  memory: { file: string; outcome: string }[],
  notes: string[],
): void {
  console.log(`\ndspec ${packageVersion()}`);
  for (const r of results) {
    const agent = AGENTS[r.agent as AgentKey];
    const counts = [
      r.added.length ? `${r.added.length} added` : null,
      r.updated.length ? `${r.updated.length} rebuilt` : null,
      r.removed.length ? `${r.removed.length} removed` : null,
    ].filter(Boolean).join(', ') || 'nothing to do';
    console.log(`  ✓ ${agent.label.padEnd(12)} ${counts}`);
    console.log(`    ${' '.repeat(12)} ${agent.note}`);
    // Named, because a removal is the one outcome somebody might not expect: a command an older
    // dspec had and this one does not.
    for (const p of r.removed.slice(0, 8)) console.log(`    ${' '.repeat(12)} − ${p}`);
    if (r.removed.length > 8) console.log(`    ${' '.repeat(12)} … +${r.removed.length - 8} more`);
  }

  // An install that was left alone is the one outcome a narrowed `--agent` might surprise
  // somebody with, now that nothing is removed for it.
  for (const key of untouched) {
    console.log(`  · ${AGENTS[key].label.padEnd(12)} already installed — not chosen, left in place`);
  }

  for (const m of memory) {
    if (m.outcome === 'unchanged') continue;
    console.log(`  ✓ ${m.file.padEnd(12)} ${WORDING[m.outcome] ?? m.outcome}`);
  }

  for (const n of notes) console.log(`\n  ! ${n}`);

  console.log(`\nNext: open your agent and type \`${INVOKE}\`. It reads the codebase and writes the map
into \`.ds/\`; after that every session answers questions from the map instead of re-reading the
repo. Start a new session if one is already open, so it picks this up.`);
}

const WORDING: Record<string, string> = {
  created: 'written',
  replaced: 'instructions updated in place',
  appended: 'instructions added — nothing else in the file was touched',
  migrated: 'replaced: the old version generated this file in full',
};
