// ============================================================
// `dspec init` — the one command a human has to type
//
// Everything else in dspec is reachable from inside an agent session, because everything else is
// an ordinary terminal command the agent can run. This one is the exception, and only because of
// the ordering: it is what puts the slash commands there in the first place.
//
// ⚠️ **One rule, no exceptions: add what is absent, never touch what is there.** See
// `install/apply.ts` for why there is no `--force` and what that costs.
//
// ⚠️ **It does not create the model.** `dspec bootstrap` does. This command installs the surface;
// a repo with no `.ds/` gets the commands and a closing line naming `/ds-bootstrap`. Keeping them
// apart is the same reason `bootstrap` and `sync` are apart: "set the tooling up" and "invent a
// model" are different intentions and one must not silently carry the other's power.
// ============================================================

import * as fs from 'node:fs';
import * as path from 'node:path';
import { AGENTS, AGENT_KEYS, COMMAND_NAMES, claudeHooksBlock, isAgentKey, type Agent, type AgentKey } from '../../install/agents';
import { addFiles, mergeJson, type Applied, type PlannedFile } from '../../install/apply';
import { canPrompt, pick } from '../../install/prompt';
import { hasModel, SPEC_DIR } from '../../model/load';
import { packageRoot, packageVersion } from '../../pkgRoot';
import { csv, parseFlags } from '../args';
import { plural } from '../../text';

const USAGE = `dspec init [--agent claude,codex,cursor] [--all] [--yes]

  Add the dspec commands to the AI coding agents you choose, in each one's own syntax. After
  this, \`/ds-bootstrap\`, \`/ds-spec\`, \`/ds-plan\` and \`/ds-sync\` are typed inside the session.

  It ADDS ONLY. A file that already exists is left exactly as it is, whoever wrote it — so to
  take a newer version of a command, delete that file and run this again.

  --agent   claude, codex, cursor — comma separated
  --all     every supported agent
  --yes     never prompt (needs --agent or --all)`;

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
    // ⚠️ **Never guess when we cannot ask.** Writing into someone's `.claude/` because a CI
    // script ran a bare `dspec init` is exactly the kind of surprise this tool must not spring.
    console.error(`✗ needs --agent or --all when there is nobody to ask\n\n${USAGE}`);
    return 2;
  } else {
    chosen = (await pick(
      'Which agents should get the dspec commands?',
      AGENT_KEYS.map((k) => {
        const a = AGENTS[k];
        return {
          key: k,
          label: a.label,
          preselected: a.detect(repo),
          note: describe(a),
        };
      }),
    )).filter(isAgentKey);
  }

  if (!chosen.length) {
    console.log('· no agents chosen — nothing written.');
    return 0;
  }

  // ---- write -----------------------------------------------------------
  const templates = path.join(packageRoot(), 'templates');
  if (!fs.existsSync(templates)) {
    console.error(`✗ this dspec has no \`templates/\` at ${templates} — the install is incomplete`);
    return 2;
  }

  const applied: Applied[] = [];
  const notes: string[] = [];
  for (const key of chosen) {
    const agent = AGENTS[key];
    let planned: PlannedFile[];
    try {
      planned = agent.plan({ repo, templates });
    } catch (err) {
      notes.push(`${agent.label}: could not read the templates — ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    applied.push(...addFiles(repo, planned));
  }

  // Claude's hooks have to be declared in a file the user owns, so this is the one place
  // anything is merged rather than created. `mergeJson` adds only missing keys and writes
  // nothing at all when it cannot parse what is there.
  if (chosen.includes('claude')) {
    const settings = path.join(repo, '.claude', 'settings.json');
    const merged = mergeJson(settings, { hooks: claudeHooksBlock() });
    if (!merged.ok) {
      notes.push(
        `.claude/settings.json could not be parsed (${merged.detail}) — NOTHING was written to it.\n`
        + '    The three session hooks are not wired. Fix the JSON and run `dspec init` again.',
      );
    } else if (!merged.changed) {
      notes.push('.claude/settings.json already declares `hooks` — left exactly as it is.');
    }
  }

  // ⚠️ Asked BEFORE anything writes into `.ds/`. `writeConfigIfAbsent` creates that directory, so
  // reading this afterwards would report every fresh repo as already having a model and swallow
  // the one line telling the user what to do next.
  const modelExists = hasModel(repo);

  // The absolute path of this CLI, for the hooks to fall back on when `dspec` is not on PATH —
  // a switched nvm version, a login shell that never sourced the profile. Same rule as every
  // other file: written only when absent. A stale entry is harmless because the hook checks the
  // path exists before using it.
  writeConfigIfAbsent(repo);

  report(chosen.map((k) => AGENTS[k]), applied, notes);

  if (!modelExists) {
    console.log(`\nThis repository has no \`${SPEC_DIR}/\` yet. Open your agent and type \`/ds-bootstrap\`.`);
  }
  return 0;
}

/** The one line each agent owes the user about what it cannot do. */
function describe(a: Agent): string {
  if (a.outsideRepo) return 'commands live in your home directory — not shared when a teammate clones';
  if (!a.hooks) return 'no session hooks: it cannot run a command on a session event';
  return 'commands, skill and the three session hooks';
}

/**
 * Record where this dspec lives, for the hooks to fall back on.
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
 *
 * The failure this prevents is silent: the post-edit hook catches its own `require` error and
 * exits 0, so the hook simply stops speaking and nothing says why.
 */
function writeConfigIfAbsent(repo: string): void {
  const file = path.join(repo, SPEC_DIR, 'config.json');
  if (fs.existsSync(file)) return;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const config = { cli: process.argv[1], root: packageRoot(), dspec: packageVersion() };
    fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  } catch {
    /* not fatal: the hooks fall through to `dspec` on PATH, which is the usual case anyway */
  }
}

function report(agents: Agent[], applied: Applied[], notes: string[]): void {
  console.log('');
  for (const agent of agents) {
    const mine = applied.filter((a) => a.agent === agent.key);
    if (!mine.length) continue;
    const added = mine.filter((a) => a.verdict === 'added').length;
    const kept = mine.length - added;
    const counts = [`${added} added`, kept ? `${kept} left alone` : null].filter(Boolean).join(', ');
    console.log(`  ✓ ${agent.label.padEnd(12)} ${plural(COMMAND_NAMES.length, 'command')} · ${counts}`);
    console.log(`    ${' '.repeat(12)} → ${home(agent)}`);
    console.log(`    ${' '.repeat(12)} ${describe(agent)}`);
  }

  for (const n of notes) console.log(`\n  ! ${n}`);

  const kept = applied.filter((a) => a.verdict === 'left alone').length;
  if (kept) {
    // ⚠️ Said out loud, every time. Somebody who upgrades dspec and sees nothing change must be
    // told why here, not left to conclude the upgrade failed.
    console.log(
      `\n${plural(kept, 'file')} already existed and ${kept === 1 ? 'was' : 'were'} not touched.`
      + ' To take a newer version of one, delete it and run `dspec init` again.',
    );
  }
  console.log(`\nType \`/ds-sync\` in your agent to start. Every one of these commands just runs \`dspec\` —
you can run it yourself, and so can the agent.`);
}

/**
 * Where an agent's files live, as one short path a user can `ls`.
 *
 * ⚠️ Derived from the agent's own marker rather than from the list of files written, which is
 * how this line used to print `/private/tmp` for Codex and five sibling directories for Cursor.
 * The marker is by definition inside the tree we want to name.
 */
function home(a: Agent): string {
  const marker = a.marker(process.cwd());
  const dir = a.key === 'cursor' ? path.dirname(path.dirname(marker)) : path.dirname(marker);
  const home = process.env.HOME;
  const shown = home && dir.startsWith(home) ? `~${dir.slice(home.length)}` : dir;
  // Repo-relative for anything inside the repo: an absolute path here is noise the user already
  // knows, and it pushes the interesting part off the right of the terminal.
  return path.isAbsolute(shown) && shown.startsWith(process.cwd())
    ? path.relative(process.cwd(), shown) || '.'
    : shown;
}
