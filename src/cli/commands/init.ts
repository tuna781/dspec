// ============================================================
// `dspec init` — install dspec into your agents, and rebuild that install on every run
//
// The terminal has two jobs and only two: put dspec's commands, skill and hooks into the agents
// (`init`), and take a newer dspec from npm (`update`). Everything else happens inside an agent
// session, through the `/dspec-*` commands this writes.
//
// ⚠️ **Every run deletes everything dspec installed, then writes it again.** Ownership is the
// `dspec` prefix — see `install/agents.ts` — plus the unprefixed files an older dspec wrote that are
// recognisably dspec's. So after `npm i -g dspec@latest` (or `dspec update`), one `dspec init`
// leaves the repo holding exactly what the new version ships: nothing out of date, nothing a newer
// version dropped. Nothing outside the prefix is touched, and in `.claude/settings.json` only
// dspec's own hook entries are.
//
// ⚠️ **It does not create the model.** `dspec sync --write` does, the first time it runs. Keeping
// them apart matters: "set the tooling up" and "invent a model" are different intentions, and one
// must not silently carry the other's power.
// ============================================================

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  AGENTS, AGENT_KEYS, CLAUDE_HOOK_SCRIPTS, claudeHookCommand, claudeHooksBlock, invoke, isAgentKey,
  legacyClaudeHookCommand, type Agent, type AgentKey,
} from '../../install/agents';
import { rebuild, replaceHooks, type PlannedFile, type Rebuilt } from '../../install/apply';
import { canPrompt, pick } from '../../install/prompt';
import { hasModel, SPEC_DIR } from '../../model/load';
import { packageRoot, packageVersion } from '../../pkgRoot';
import { csv, parseFlags } from '../args';
import { plural } from '../../text';

const USAGE = `dspec init [--agent claude,codex,cursor] [--all] [--yes]

  Install dspec into the AI coding agents you choose: the ${invoke('sync')}, ${invoke('spec')},
  ${invoke('plan')} and ${invoke('update')} commands, the dspec skill, and (Claude Code) the session hooks.

  Every run REBUILDS the install: everything dspec wrote before — every \`dspec\`-prefixed command,
  skill and hook, and dspec's own entries in .claude/settings.json — is deleted and written again
  from this version. Run it after \`dspec update\`. Nothing without the prefix is ever touched.

  --agent   claude, codex, cursor — comma separated
  --all     every supported agent
  --yes     never prompt: rebuild the agents already installed here (or those named)`;

interface InitFlags {
  agent?: string | string[];
  all?: boolean;
  yes?: boolean;
  help?: boolean;
}

export async function cmdInit(argv: string[]): Promise<number> {
  const { values } = parseFlags<InitFlags>(argv, {
    agent: { type: 'string', multiple: true },
    all: { type: 'boolean' },
    yes: { type: 'boolean', short: 'y' },
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

  let chosen: AgentKey[];
  if (values.all) {
    chosen = [...AGENT_KEYS];
  } else if (named.length) {
    chosen = named.filter(isAgentKey);
  } else if (values.yes || !canPrompt()) {
    // With nobody to ask, rebuild what is already here — that is what `/dspec-update` relies on.
    // ⚠️ **Never guess a FIRST install.** Writing into someone's `.claude/` because a CI script ran
    // a bare `dspec init` is exactly the kind of surprise this tool must not spring.
    if (!installed.length) {
      console.error(`✗ dspec is not installed for any agent here — name one with --agent or --all\n\n${USAGE}`);
      return 2;
    }
    chosen = installed;
  } else {
    chosen = (await pick(
      'Which agents should get dspec?',
      AGENT_KEYS.map((k) => {
        const a = AGENTS[k];
        return {
          key: k,
          label: a.label,
          // An upgrade is Enter: whatever is installed now is what gets rebuilt.
          preselected: installed.length ? installed.includes(k) : a.detect(repo),
          note: describe(a),
        };
      }),
    )).filter(isAgentKey);
  }

  if (!chosen.length) {
    console.log('· no agents chosen — nothing written.');
    return 0;
  }

  const templates = path.join(packageRoot(), 'templates');
  if (!fs.existsSync(templates)) {
    console.error(`✗ this dspec has no \`templates/\` at ${templates} — the install is incomplete`);
    return 2;
  }

  // ---- plan everything before deleting anything ------------------------
  // A template that cannot be read must not leave the agent with its old install deleted and no
  // new one written.
  const plans = new Map<AgentKey, PlannedFile[]>();
  for (const key of chosen) {
    try {
      plans.set(key, AGENTS[key].plan({ repo, templates }));
    } catch (err) {
      console.error(`✗ ${AGENTS[key].label}: could not read the templates — ${err instanceof Error ? err.message : String(err)}`);
      return 2;
    }
  }

  // ---- rebuild -----------------------------------------------------------
  const results: Rebuilt[] = [];
  const notes: string[] = [];
  for (const key of AGENT_KEYS) {
    const agent = AGENTS[key];
    const planned = plans.get(key);
    // ⚠️ An agent that lives outside the repo (Codex, in the home directory) is shared by every
    // repo on the machine. Not choosing it HERE is not a request to uninstall it everywhere.
    if (!planned && agent.outsideRepo) continue;
    if (!planned && !installed.includes(key)) continue;
    results.push(rebuild(repo, key, [...agent.owned(repo), ...agent.legacy(repo)], planned ?? []));
  }

  if (chosen.includes('claude') || installed.includes('claude')) {
    const add = chosen.includes('claude') ? claudeHooksBlock() : {};
    const ours = new Set([...CLAUDE_HOOK_SCRIPTS.flatMap((f) => [claudeHookCommand(f), legacyClaudeHookCommand(f)])]);
    const outcome = replaceHooks(path.join(repo, '.claude', 'settings.json'), add as never, (c) => ours.has(c));
    if (!outcome.ok) {
      notes.push(
        `.claude/settings.json could not be parsed (${outcome.detail}) — NOTHING was written to it.\n`
        + '    The session hooks are not wired. Fix the JSON and run `dspec init` again.',
      );
    }
  }

  // Asked BEFORE `.ds/config.json` is written, though `hasModel` no longer mistakes that file for a
  // model — the order keeps the question honest either way.
  const modelExists = hasModel(repo);
  writeConfig(repo);

  report(chosen, results, notes);

  if (!modelExists) {
    console.log(`\nThis repository has no \`${SPEC_DIR}/\` model yet. Open your agent and type \`${invoke('sync')}\`.`);
  }
  return 0;
}

/** Installed now, or by a dspec from before the prefix. Derived from the files, never stored. */
function isInstalled(a: Agent, repo: string): boolean {
  return fs.existsSync(a.marker(repo)) || fs.existsSync(a.legacyMarker(repo));
}

/** The one line each agent owes the user about what it cannot do. */
function describe(a: Agent): string {
  if (a.outsideRepo) return 'commands live in your home directory — not shared when a teammate clones';
  if (!a.hooks) return 'no session hooks: it cannot run a command on a session event';
  return 'commands, skill and the three session hooks';
}

/**
 * Record where this dspec lives, for the hooks to fall back on — rewritten on every run, because
 * the path and the version are exactly what an upgrade changes.
 *
 * Two fields, and they answer two different questions:
 *   `cli`  — what to SPAWN. A `bin/dspec` shim is perfectly good for that.
 *   `root` — where to `require` dspec's own modules from.
 *
 * ⚠️ **`root` cannot be derived from `cli`, and deriving it is a bug that only appears once
 * somebody installs for real.** After `npm i -g dspec`, `process.argv[1]` is `<prefix>/bin/dspec`,
 * a symlink npm made; its parent's parent is `<prefix>`, which holds no `dist/`. The package is at
 * `<prefix>/lib/node_modules/dspec`. `packageRoot()` already walks up from this compiled file, so
 * it is right in every layout — global, local, or a checkout somebody is hacking on.
 */
function writeConfig(repo: string): void {
  const file = path.join(repo, SPEC_DIR, 'config.json');
  const body = JSON.stringify({ cli: process.argv[1], root: packageRoot(), dspec: packageVersion() }, null, 2) + '\n';
  try {
    if (fs.existsSync(file) && fs.readFileSync(file, 'utf-8') === body) return;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body, 'utf-8');
  } catch {
    /* not fatal: the hooks fall through to `dspec` on PATH, which is the usual case anyway */
  }
}

function report(chosen: AgentKey[], results: Rebuilt[], notes: string[]): void {
  console.log(`\ndspec ${packageVersion()}`);
  for (const r of results) {
    const agent = AGENTS[r.agent as AgentKey];
    if (!chosen.includes(agent.key)) {
      if (r.removed.length) console.log(`  − ${agent.label.padEnd(12)} not chosen — removed ${plural(r.removed.length, 'file')}`);
      continue;
    }
    const counts = [
      r.added.length ? `${r.added.length} added` : null,
      r.updated.length ? `${r.updated.length} rebuilt` : null,
      r.removed.length ? `${r.removed.length} removed` : null,
    ].filter(Boolean).join(', ');
    console.log(`  ✓ ${agent.label.padEnd(12)} ${counts}`);
    console.log(`    ${' '.repeat(12)} → ${home(agent)}`);
    console.log(`    ${' '.repeat(12)} ${describe(agent)}`);
    // Named, because a removal is the one outcome somebody might not expect: a command an older
    // dspec had and this one does not.
    for (const p of r.removed.slice(0, 8)) console.log(`    ${' '.repeat(12)} − ${p}`);
    if (r.removed.length > 8) console.log(`    ${' '.repeat(12)} … +${r.removed.length - 8} more`);
  }

  for (const n of notes) console.log(`\n  ! ${n}`);

  console.log(`\nType \`${invoke('sync')}\` in your agent to start — start a new session if one is already open, so it
reads the rebuilt commands. Every one of these commands just runs \`dspec\`: you can run it yourself.`);
}

/**
 * Where an agent's files live, as one short path a user can `ls`.
 *
 * ⚠️ Derived from the agent's own marker rather than from the list of files written, which is
 * how this line used to print `/private/tmp` for Codex and five sibling directories for Cursor.
 */
function home(a: Agent): string {
  const cwd = process.cwd();
  const marker = a.marker(cwd);
  const dir = a.key === 'cursor' ? path.dirname(path.dirname(marker)) : path.dirname(marker);
  // Repo-relative first: a repo under $HOME would otherwise be shown as `~/…` and never relative.
  if (dir === cwd || dir.startsWith(cwd + path.sep)) return path.relative(cwd, dir) || '.';
  const homeDir = process.env.HOME;
  return homeDir && dir.startsWith(homeDir) ? `~${dir.slice(homeDir.length)}` : dir;
}
