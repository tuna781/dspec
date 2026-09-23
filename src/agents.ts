// ============================================================
// The agent adapters — the one place anything is agent-specific
//
// dspec's real interface is prose: one command and one instruction block, written once in
// `templates/`. What differs between Claude Code, Codex and Cursor is not what the prose SAYS, it
// is where the file goes and what its frontmatter is called. So an adapter is a description of
// those two things and nothing else — never a second copy of the instructions.
//
// ⚠️ **The templates carry no frontmatter.** Each adapter prepends its own, built here as a
// string. The alternative — shipping frontmatter and rewriting it per agent — is what a whole
// YAML parser existed for, to translate three keys.
//
// ⚠️ **One command, one spelling in every agent: `/ds-bootstrap`.** Everything else dspec used to
// install was a workflow, and a workflow is the thing this version does not impose. What an agent
// needs in order to USE the map is in the memory-file block, which it reads without being asked.
//
// ⚠️ **No hooks.** Claude Code was the only agent that could run a command on a session event,
// and using that made Claude a different product from the other two. `CLAUDE.md` / `AGENTS.md` is
// read automatically by all three, which is enough and is equal.
// ============================================================

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  existingLegacy, isManaged, managed, oldPrefixed, withMark, type PlannedFile,
} from './install';

export type AgentKey = 'claude' | 'codex' | 'cursor';

export const AGENT_KEYS: AgentKey[] = ['claude', 'codex', 'cursor'];

export function isAgentKey(s: string): s is AgentKey {
  return (AGENT_KEYS as string[]).includes(s);
}

/** The only command dspec installs — the same name, and the same spelling, in every agent. */
export const COMMAND = 'ds-bootstrap';

/** How it is typed once installed. */
export const INVOKE = `/${COMMAND}`;

/** What the agent's command menu says about it. One sentence, three frontmatters. */
export const DESCRIPTION =
  'Map this codebase into .ds/ so any agent can answer questions about it and plan changes to it without reading the whole repo';

/**
 * What the command menu offers to type after it. A large repository is mapped a part at a time,
 * and the template reads the part from what the user wrote — so the hint is only a prompt, and an
 * agent that shows none (Cursor documents no such key) loses nothing but the reminder.
 */
export const ARGUMENT_HINT = 'optional — an app, service or directory to map';

/** 0.0.1 installed these, unprefixed and unmarked. Removed only when recognisably dspec's. */
const LEGACY_COMMANDS = ['spec', 'plan', 'sync', 'bootstrap', 'update'];

/** 0.1.x put its hook scripts here, and 0.0.1 put them directly in `.claude/hooks/`. */
const LEGACY_HOOK_DIR = '.claude/hooks/dspec';
const LEGACY_HOOK_SCRIPTS = ['_ds.js', 'session-start.js', 'post-edit.js', 'stop.js'];

/** The commands 0.1.x wrote into `settings.json`. Recognised so they can be taken back out. */
export const legacyHookCommands = (): string[] => [
  ...LEGACY_HOOK_SCRIPTS.map((f) => `node "$CLAUDE_PROJECT_DIR/${LEGACY_HOOK_DIR}/${f}"`),
  ...LEGACY_HOOK_SCRIPTS.map((f) => `node "$CLAUDE_PROJECT_DIR/.claude/hooks/${f}"`),
];

export interface Agent {
  key: AgentKey;
  label: string;
  /**
   * One file that exists only because dspec put it there.
   *
   * This is how "is dspec installed for this agent?" is answered — **derived from the checkout,
   * never stored.** It decides whether an agent left out of `--agent` had anything here to take
   * back; it is never a guess at whether somebody uses that agent.
   */
  marker(repo: string): string;
  /** The same question for an install made by an older dspec. */
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
  /** Does it keep its command outside the repo, so a teammate does not get it on clone? */
  outsideRepo?: boolean;
  /** The one line this agent owes the user about where its files landed. */
  note: string;
  /** The command file this agent should receive. */
  plan(ctx: PlanContext): PlannedFile[];
}

export interface PlanContext {
  /** Absolute path of the repository root. */
  repo: string;
  /** `templates/` inside the running dspec. */
  templates: string;
}

/** The body of the one command, read once per run. */
function bootstrapBody(ctx: PlanContext): string {
  return fs.readFileSync(path.join(ctx.templates, 'bootstrap.md'), 'utf-8').trim();
}

/** A frontmatter block from ordered pairs. No parser, because nothing here is ever read back. */
function frontmatter(pairs: [string, string][]): string {
  return ['---', ...pairs.map(([k, v]) => `${k}: ${v}`), '---', ''].join('\n');
}

const commandFile = (agent: AgentKey, target: string, meta: [string, string][], body: string): PlannedFile => ({
  path: target,
  agent,
  content: withMark(frontmatter(meta) + '\n' + body),
});

// ─── Claude Code ────────────────────────────────────────────────────────────

const claude: Agent = {
  key: 'claude',
  label: 'Claude Code',
  memoryFile: 'CLAUDE.md',
  note: `${INVOKE} in .claude/commands/, and the map instructions in CLAUDE.md`,
  marker: (repo) => path.join(repo, '.claude', 'commands', `${COMMAND}.md`),
  legacyMarkers: (repo) => [
    path.join(repo, '.claude', 'commands', 'ds.md'),
    path.join(repo, '.claude', 'commands', 'dspec-sync.md'),
    path.join(repo, '.claude', 'commands', 'ds-sync.md'),
  ],
  owned: (repo) => [
    ...managed(path.join(repo, '.claude', 'commands'), '.md'),
    ...managed(path.join(repo, '.claude', 'skills')),
    // ⚠️ Unconditional, and not mark-checked: `.claude/hooks/dspec/` is a directory name nothing
    // but dspec ever writes, and 0.1.x's hooks must go — this version deletes the scripts they
    // point at, and a hook whose script is missing fails on every single session start.
    ...[path.join(repo, LEGACY_HOOK_DIR)].filter((p) => fs.existsSync(p)),
  ],
  legacy: (repo) => [
    ...oldPrefixed(path.join(repo, '.claude', 'commands'), '.md').filter((p) => path.basename(p) !== 'dspec'),
    ...oldPrefixed(path.join(repo, '.claude', 'skills')),
    ...existingLegacy([
      ...LEGACY_COMMANDS.map((n) => path.join(repo, '.claude', 'commands', `ds-${n}.md`)),
      path.join(repo, '.claude', 'commands', 'ds.md'),
      path.join(repo, '.claude', 'skills', 'ds'),
      ...LEGACY_HOOK_SCRIPTS.map((f) => path.join(repo, '.claude', 'hooks', f)),
    ]),
  ],
  plan(ctx) {
    // Claude is the only one of the three that HONOURS `allowed-tools`, so it is the only one
    // given a list. Bootstrap reads the codebase and writes `.ds/`; it needs no more than this.
    return [commandFile('claude', `.claude/commands/${COMMAND}.md`, [
      ['description', DESCRIPTION],
      ['argument-hint', ARGUMENT_HINT],
      ['allowed-tools', 'Read, Write, Edit, Grep, Glob, Bash'],
    ], bootstrapBody(ctx))];
  },
};

// ─── Codex CLI ──────────────────────────────────────────────────────────────

/**
 * Codex reads custom prompts from `$CODEX_HOME/prompts` and nowhere else — not from the repo.
 *
 * ⚠️ **This is the one adapter that writes outside the repository**, and the two consequences are
 * reported rather than hidden: a teammate who clones gets nothing for Codex until they run
 * `dspec init` themselves, and a second `dspec init` in another repo finds the file already
 * there. Repo-scoped skills exist (`.agents/skills/`) but are invoked as `$name` or through the
 * `/skills` picker — not as `/ds-bootstrap`, which is the thing being preserved.
 */
export function codexPromptsDir(): string {
  return path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'prompts');
}

const codex: Agent = {
  key: 'codex',
  label: 'Codex CLI',
  memoryFile: 'AGENTS.md',
  outsideRepo: true,
  note: `${INVOKE} in ~/.codex/prompts — not shared when a teammate clones`,
  marker: () => path.join(codexPromptsDir(), `${COMMAND}.md`),
  legacyMarkers: () => [
    path.join(codexPromptsDir(), 'ds.md'),
    path.join(codexPromptsDir(), 'dspec-sync.md'),
    path.join(codexPromptsDir(), 'ds-sync.md'),
  ],
  owned: () => managed(codexPromptsDir(), '.md'),
  legacy: () => [
    ...oldPrefixed(codexPromptsDir(), '.md').filter((p) => path.basename(p) !== 'dspec'),
    ...existingLegacy([
      ...LEGACY_COMMANDS.map((n) => path.join(codexPromptsDir(), `ds-${n}.md`)),
      path.join(codexPromptsDir(), 'ds.md'),
    ]),
  ],
  plan(ctx) {
    // Codex documents exactly two frontmatter keys and ignores subdirectories, so the file is
    // flat and carries those two and nothing else. `allowed-tools` here would be silently
    // meaningless.
    return [commandFile('codex', path.join(codexPromptsDir(), `${COMMAND}.md`), [
      ['description', DESCRIPTION],
      ['argument-hint', ARGUMENT_HINT],
    ], bootstrapBody(ctx))];
  },
};

// ─── Cursor ─────────────────────────────────────────────────────────────────

/**
 * Cursor loads skills from `.agents/skills/` and invokes each one as `/<name>` — a real slash
 * command, committed to the repo, shared on clone. It honours no tool list.
 */
const cursor: Agent = {
  key: 'cursor',
  label: 'Cursor',
  memoryFile: 'AGENTS.md',
  note: `${INVOKE} in .agents/skills/, and the map instructions in AGENTS.md`,
  marker: (repo) => path.join(repo, '.agents', 'skills', COMMAND, 'SKILL.md'),
  legacyMarkers: (repo) => [
    path.join(repo, '.agents', 'skills', 'ds', 'SKILL.md'),
    path.join(repo, '.agents', 'skills', 'dspec-sync', 'SKILL.md'),
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
    // `name` first, then `description`: those are the only two keys Cursor documents, and a skill
    // is identified by its name — a reader scanning the directory should meet it first.
    return [commandFile('cursor', `.agents/skills/${COMMAND}/SKILL.md`, [
      ['name', COMMAND],
      ['description', DESCRIPTION],
    ], bootstrapBody(ctx))];
  },
};

// ─── the registry ───────────────────────────────────────────────────────────

export const AGENTS: { [K in AgentKey]: Agent } = { claude, codex, cursor };

/**
 * Installed now, or by an older dspec. Derived from the files, never stored.
 *
 * ⚠️ The current marker is checked for dspec's MARK, not merely for existence: somebody else's
 * `ds-bootstrap.md` is not an install of ours, and treating it as one would have `init` rebuild
 * — which is to say delete and rewrite — a file dspec has no claim on.
 */
export function isInstalled(agent: Agent, repo: string): boolean {
  return isManaged(agent.marker(repo)) || agent.legacyMarkers(repo).some((m) => fs.existsSync(m));
}
