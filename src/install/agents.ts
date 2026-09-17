// ============================================================
// The agent adapters — the one place anything is agent-specific
//
// dspec's real interface is prose: three commands and a skill, written once in `templates/`. What
// differs between Claude Code, Codex and Cursor is not what the prose SAYS, it is where the file
// goes, what its frontmatter is called, and how an argument arrives. So an adapter is a
// description of those three things and nothing else — never a second copy of the instructions.
//
// ⚠️ **A slash command is not a separate kind of thing.** Every dspec command is a terminal
// command; `/dspec-sync` is prose telling the agent to run `dspec sync` and what to judge in the
// output. That is why porting to another agent is frontmatter work: the behaviour was never in
// the agent, it was in the CLI.
//
// ⚠️ **Three commands, one spelling in every agent: `/ds`, `/ds-bootstrap`, `/ds-update`.** There is
// no skill: in Claude Code and Cursor a skill is also a slash command, and a fourth name in the menu
// is exactly the surface this was cut down to avoid. What the skill used to teach lives in the
// memory file's dspec block and in `dspec sync --guide`.
//
// ⚠️ **Ownership is a MARK, not a name.** `ds` and `ds-*` are short enough that a user or another
// tool may already have a `ds-deploy.md`. Every file dspec installs therefore carries
// `dspec:managed`, and `dspec init` deletes only files that carry it — plus the hook directory
// `.claude/hooks/dspec/`, and the installs of older versions, recognised by name or by content.
// ============================================================

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { onlyMeta, parseDoc, renderDoc, substituteArgs, substituteCommands, substituteDocs, substituteFence, withMeta } from './render';
import type { PlannedFile } from './apply';

export type AgentKey = 'claude' | 'codex' | 'cursor';

export const AGENT_KEYS: AgentKey[] = ['claude', 'codex', 'cursor'];

export function isAgentKey(s: string): s is AgentKey {
  return (AGENT_KEYS as string[]).includes(s);
}

/** The three commands, in the order they are reported. `ds` is the core; the other two are `ds-*`. */
export const COMMAND_NAMES = ['ds', 'bootstrap', 'update'] as const;

/** The name a command is installed under — a file name, a directory name, and what follows `/`. */
export const installedName = (name: string): string => (name === 'ds' ? 'ds' : `ds-${name}`);

/** How a command is typed once installed. The same in every agent — see the header. */
export const invoke = (name: string): string => `/${installedName(name)}`;

/** Carried by every file dspec installs. `dspec init` deletes only what carries it. */
export const MANAGED_MARK = 'dspec:managed';

/** 0.0.2 and 0.0.3 installed under this prefix, which nothing else uses. Removed by name. */
const OLD_PREFIX = 'dspec';

/** 0.0.1 installed these, unprefixed and unmarked. Removed only when recognisably dspec's. */
const LEGACY_COMMANDS = ['spec', 'plan', 'sync', 'bootstrap'];

export interface Agent {
  key: AgentKey;
  label: string;
  /**
   * Does this machine or repo look like it uses this agent? Preselects the picker, and nothing
   * else — a `.claude/` directory says somebody uses Claude Code, not that dspec is installed.
   */
  detect(repo: string): boolean;
  /**
   * One file that exists only because dspec put it there.
   *
   * This is how "is dspec installed for this agent?" is answered — **derived from the checkout,
   * never stored.** It is a different question from `detect`, and conflating the two is how a
   * repo that chose Claude alone would still be handed an `AGENTS.md`.
   */
  marker(repo: string): string;
  /** The same question for an install made by an older dspec (0.0.1 – 0.0.3). */
  legacyMarkers(repo: string): string[];
  /**
   * Every path this agent's install occupies right now — what `dspec init` deletes before writing.
   * Directories are listed as directories and removed whole.
   */
  owned(repo: string): string[];
  /** Paths an older dspec wrote, recognised by their old prefix or their content. Removed too. */
  legacy(repo: string): string[];
  /** The file this agent reads at the start of a session. */
  memoryFile: 'CLAUDE.md' | 'AGENTS.md';
  /** Can it run a command on a session event? Claude Code alone can. */
  hooks: boolean;
  /** Does it keep its commands outside the repo, so a teammate does not get them on clone? */
  outsideRepo?: boolean;
  /** Everything this agent should receive. */
  plan(ctx: PlanContext): PlannedFile[];
}

export interface PlanContext {
  /** Absolute path of the repository root. */
  repo: string;
  /** `templates/` inside the running dspec. */
  templates: string;
}

// ─── reading the templates ──────────────────────────────────────────────────

function template(ctx: PlanContext, ...parts: string[]): string {
  return fs.readFileSync(path.join(ctx.templates, ...parts), 'utf-8');
}

// ─── what an install occupies ───────────────────────────────────────────────

/** Does this file (or this skill directory's SKILL.md) carry dspec's mark? */
export function isManaged(p: string): boolean {
  try {
    const file = fs.statSync(p).isDirectory() ? path.join(p, 'SKILL.md') : p;
    return fs.readFileSync(file, 'utf-8').includes(MANAGED_MARK);
  } catch {
    return false;
  }
}

/** Entries of `dir` named `ds` / `ds-*` (optionally ending in `suffix`) that carry the mark. */
function managed(dir: string, suffix = ''): string[] {
  let names: string[];
  try { names = fs.readdirSync(dir); } catch { return []; }
  return names
    .filter((n) => n.endsWith(suffix) && (n.slice(0, n.length - suffix.length) === 'ds' || n.startsWith('ds-')))
    .map((n) => path.join(dir, n))
    .filter(isManaged);
}

/** Entries of `dir` from the 0.0.2 – 0.0.3 install: `dspec-*` (with `suffix`) or exactly `dspec`. */
function oldPrefixed(dir: string, suffix = ''): string[] {
  let names: string[];
  try { names = fs.readdirSync(dir); } catch { return []; }
  return names
    .filter((n) => (n.startsWith(`${OLD_PREFIX}-`) && n.endsWith(suffix)) || n === OLD_PREFIX)
    .map((n) => path.join(dir, n));
}

/**
 * Did dspec write this? Asked only of LEGACY paths, whose names (`stop.js`, `ds-sync.md`) a user or
 * another tool could also have chosen. Every file dspec ever shipped names dspec, its model
 * directory `.ds/`, one of its own `/ds-*` commands, or loads its hook helper — a file that does
 * none of those is somebody else's and is kept.
 *
 * ⚠️ **"names dspec" alone is not enough.** 0.0.1's `ds-plan` prompt, once Codex and Cursor had
 * dropped its tool list, never says "dspec": it only points at `/ds-spec`. Checked against the
 * published 0.0.1 package, it survived the upgrade as a stale command until the other signals
 * were added.
 */
function writtenByDspec(p: string): boolean {
  try {
    const file = fs.statSync(p).isDirectory() ? path.join(p, 'SKILL.md') : p;
    return /dspec|\.ds\/|\/ds-(?:spec|plan|sync|bootstrap)\b|require\('\.\/_ds'\)/i.test(fs.readFileSync(file, 'utf-8'));
  } catch {
    return false;
  }
}

const existingLegacy = (paths: string[]): string[] =>
  paths.filter((p) => fs.existsSync(p) && !isManaged(p) && writtenByDspec(p));

/** Mark an installed file. Markdown takes an HTML comment an agent never renders; a script, a line comment. */
const withMark = (content: string, kind: 'md' | 'js'): string =>
  `${content.replace(/\n*$/, '\n')}${kind === 'md' ? `\n<!-- ${MANAGED_MARK} -->` : `// ${MANAGED_MARK}`}\n`;

/** Installed now, or by an older dspec. Derived from the files, never stored. */
export function isInstalled(agent: Agent, repo: string): boolean {
  return isManaged(agent.marker(repo)) || agent.legacyMarkers(repo).some((m) => fs.existsSync(m));
}

/**
 * Resolve one template into final prose: command names, the language block, and arguments.
 *
 * `argForm` is the agent's own argument syntax, or `null` where it has none — in which case
 * `substituteArgs` writes a plain English phrase instead of inventing a variable. See its own
 * documentation for why prose beats a made-up `${input:args}`.
 */
function prose(raw: string, argForm: string | null, fence: boolean): { meta: ReturnType<typeof parseDoc>['meta']; body: string } {
  const doc = parseDoc(raw);
  let body = substituteFence(substituteDocs(substituteCommands(doc.body, invoke)), fence);
  if (argForm === null) body = substituteArgs(body, 'what the user typed alongside this command');
  return { meta: doc.meta, body };
}

function commandFiles(
  ctx: PlanContext,
  agent: AgentKey,
  argForm: string | null,
  fence: boolean,
  target: (name: string) => string,
  frontmatter: (meta: { [k: string]: unknown }, name: string) => { [k: string]: unknown },
): PlannedFile[] {
  return COMMAND_NAMES.map((name) => {
    const { meta, body } = prose(template(ctx, 'commands', `${name}.md`), argForm, fence);
    return {
      path: target(installedName(name)),
      agent,
      content: withMark(renderDoc({ meta: frontmatter(meta, installedName(name)) as never, body }), 'md'),
    };
  });
}

// ─── Claude Code ────────────────────────────────────────────────────────────

const HOOK_SCRIPTS = ['_ds.js', 'session-start.js', 'post-edit.js', 'stop.js'];

/** Where Claude's hook scripts live — a directory dspec owns outright. */
export const CLAUDE_HOOK_DIR = '.claude/hooks/dspec';

/** The command a hook entry runs. One definition, so removing ours matches exactly what added it. */
export const claudeHookCommand = (file: string): string => `node "$CLAUDE_PROJECT_DIR/${CLAUDE_HOOK_DIR}/${file}"`;

/** The command 0.0.1 wrote into `settings.json`, for scripts that sat directly in `.claude/hooks/`. */
export const legacyClaudeHookCommand = (file: string): string => `node "$CLAUDE_PROJECT_DIR/.claude/hooks/${file}"`;

export const CLAUDE_HOOK_SCRIPTS: readonly string[] = HOOK_SCRIPTS;

/**
 * The `hooks` block added to the user's `.claude/settings.json`.
 *
 * `$CLAUDE_PROJECT_DIR` rather than an absolute path: the same settings file is committed and
 * read on every teammate's machine, and an absolute path is right on exactly one of them.
 */
export function claudeHooksBlock(): Record<string, unknown> {
  const run = (file: string, timeout: number) => ({
    type: 'command',
    command: claudeHookCommand(file),
    timeout,
  });
  return {
    SessionStart: [{ hooks: [run('session-start.js', 15)] }],
    PostToolUse: [{ matcher: 'Edit|Write|MultiEdit|NotebookEdit', hooks: [run('post-edit.js', 8)] }],
    Stop: [{ hooks: [run('stop.js', 10)] }],
  };
}

const claude: Agent = {
  key: 'claude',
  label: 'Claude Code',
  memoryFile: 'CLAUDE.md',
  hooks: true,
  detect: (repo) => fs.existsSync(path.join(repo, '.claude')),
  marker: (repo) => path.join(repo, '.claude', 'commands', 'ds.md'),
  legacyMarkers: (repo) => [
    path.join(repo, '.claude', 'commands', `${OLD_PREFIX}-sync.md`),
    path.join(repo, '.claude', 'commands', 'ds-sync.md'),
  ],
  owned: (repo) => [
    ...managed(path.join(repo, '.claude', 'commands'), '.md'),
    ...managed(path.join(repo, '.claude', 'skills')),
    ...[path.join(repo, CLAUDE_HOOK_DIR)].filter((p) => fs.existsSync(p)),
  ],
  legacy: (repo) => [
    ...oldPrefixed(path.join(repo, '.claude', 'commands'), '.md').filter((p) => path.basename(p) !== OLD_PREFIX),
    ...oldPrefixed(path.join(repo, '.claude', 'skills')),
    ...existingLegacy([
      ...LEGACY_COMMANDS.map((n) => path.join(repo, '.claude', 'commands', `ds-${n}.md`)),
      path.join(repo, '.claude', 'skills', 'ds'),
      ...HOOK_SCRIPTS.map((f) => path.join(repo, '.claude', 'hooks', f)),
    ]),
  ],
  plan(ctx) {
    // Claude keeps the frontmatter as written: it is the only one of the three that HONOURS
    // `allowed-tools`, and that list is the only instruction here anybody actually enforces.
    const files = commandFiles(ctx, 'claude', '$ARGUMENTS', true, (n) => `.claude/commands/${n}.md`, (meta) => meta);
    for (const file of HOOK_SCRIPTS) {
      files.push({
        path: `${CLAUDE_HOOK_DIR}/${file}`,
        agent: 'claude',
        content: withMark(template(ctx, 'hooks', file), 'js'),
        executable: true,
      });
    }
    return files;
  },
};

// ─── Codex CLI ──────────────────────────────────────────────────────────────

/**
 * Codex reads custom prompts from `$CODEX_HOME/prompts` and nowhere else — not from the repo.
 *
 * ⚠️ **This is the one adapter that writes outside the repository**, and the two consequences are
 * reported rather than hidden: a teammate who clones gets nothing for Codex until they run
 * `dspec init` themselves, and a second `dspec init` in another repo finds these files already
 * there. Repo-scoped skills exist (`.agents/skills/`) but are invoked as `$name` or through the
 * `/skills` picker — not as `/ds`, which is the thing being preserved.
 */
export function codexPromptsDir(): string {
  return path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'prompts');
}

const codex: Agent = {
  key: 'codex',
  label: 'Codex CLI',
  memoryFile: 'AGENTS.md',
  hooks: false,
  outsideRepo: true,
  detect: () => fs.existsSync(path.dirname(codexPromptsDir())),
  marker: () => path.join(codexPromptsDir(), 'ds.md'),
  legacyMarkers: () => [path.join(codexPromptsDir(), `${OLD_PREFIX}-sync.md`), path.join(codexPromptsDir(), 'ds-sync.md')],
  owned: () => managed(codexPromptsDir(), '.md'),
  legacy: () => [
    ...oldPrefixed(codexPromptsDir(), '.md').filter((p) => path.basename(p) !== OLD_PREFIX),
    ...existingLegacy(LEGACY_COMMANDS.map((n) => path.join(codexPromptsDir(), `ds-${n}.md`))),
  ],
  plan(ctx) {
    const dir = codexPromptsDir();
    // Codex documents exactly two frontmatter keys and ignores subdirectories, so the files are
    // flat and everything else is dropped. `allowed-tools` would be silently meaningless here —
    // and a fence that does not exist must not be left in the file looking like one.
    return commandFiles(
      ctx,
      'codex',
      '$ARGUMENTS',
      false,
      (n) => path.join(dir, `${n}.md`),
      (meta) => onlyMeta({ meta: meta as never, body: '' }, ['description', 'argument-hint']).meta,
    );
  },
};

// ─── Cursor ─────────────────────────────────────────────────────────────────

/**
 * Cursor loads skills from `.agents/skills/` and invokes each one as `/<name>` — a real slash
 * command, committed to the repo, shared on clone.
 *
 * ⚠️ **A skill takes no arguments and honours no tool list.** `argForm: null` therefore puts a
 * plain English phrase where `$ARGUMENTS` was, and `/ds`'s promise that it builds nothing before the
 * user approves is instructed, never enforced.
 */
const cursor: Agent = {
  key: 'cursor',
  label: 'Cursor',
  memoryFile: 'AGENTS.md',
  hooks: false,
  detect: (repo) => fs.existsSync(path.join(repo, '.cursor')) || fs.existsSync(path.join(repo, '.agents')),
  marker: (repo) => path.join(repo, '.agents', 'skills', 'ds', 'SKILL.md'),
  legacyMarkers: (repo) => [
    path.join(repo, '.agents', 'skills', `${OLD_PREFIX}-sync`, 'SKILL.md'),
    path.join(repo, '.agents', 'skills', 'ds-sync', 'SKILL.md'),
  ],
  owned: (repo) => managed(path.join(repo, '.agents', 'skills')),
  legacy: (repo) => [
    ...oldPrefixed(path.join(repo, '.agents', 'skills')),
    ...existingLegacy([
      ...LEGACY_COMMANDS.map((n) => path.join(repo, '.agents', 'skills', `ds-${n}`)),
      path.join(repo, '.agents', 'skills', 'ds'),
    ]),
  ],
  plan(ctx) {
    return commandFiles(
      ctx,
      'cursor',
      null,
      false,
      (n) => `.agents/skills/${n}/SKILL.md`,
      // `name` first, then `description`: those are the only two keys Cursor documents, and a
      // skill is identified by its name — a reader scanning the directory should meet it first.
      (meta, name) =>
        onlyMeta(
          withMeta({ meta: meta as never, body: '' }, {
            name,
            'argument-hint': undefined,
            'allowed-tools': undefined,
          }),
          ['name', 'description'],
        ).meta,
    );
  },
};

// ─── the registry ───────────────────────────────────────────────────────────

export const AGENTS: { [K in AgentKey]: Agent } = { claude, codex, cursor };

/** Every agent dspec has actually been installed for. Derived from the files, never stored. */
export function installedAgents(repo: string): Agent[] {
  return AGENT_KEYS.map((k) => AGENTS[k]).filter((a) => isInstalled(a, repo));
}

/**
 * Which memory files this repository should render.
 *
 * ⚠️ **Derived, never stored** — from two things, and it needs both:
 *   - **the files already on disk**, so a repo keeps rendering whatever it has been rendering;
 *   - **the installed agents**, so the first `dspec sync --write` after choosing Cursor actually
 *     produces the `AGENTS.md` that Cursor is going to read.
 *
 * Neither alone is enough: markers alone would stop refreshing a file whose agent was later
 * uninstalled, and disk alone would never create the first one.
 *
 * ⚠️ **Codex's marker lives in the user's home directory**, so somebody who uses Codex at all
 * gets an `AGENTS.md` in every repo they run `dspec sync` in — including one where they only
 * chose Claude Code. That is the known cost of Codex having no repo-scoped command location
 * (see `codexPromptsDir`). Handing a Codex user a correct pointer file they did not ask for is
 * the better failure: the alternative is a Codex session that reads nothing at all.
 *
 * A repo with nothing at all gets `CLAUDE.md` — what every model written before adapters has,
 * so an old checkout behaves exactly as it did.
 */
export function memoryFilesFor(repo: string): string[] {
  const known = ['CLAUDE.md', 'AGENTS.md'];
  const wanted = new Set<string>(known.filter((f) => fs.existsSync(path.join(repo, f))));
  for (const agent of installedAgents(repo)) wanted.add(agent.memoryFile);
  return wanted.size ? known.filter((f) => wanted.has(f)) : ['CLAUDE.md'];
}
