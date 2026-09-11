'use strict';
/**
 * Shared base for the three DSpec hooks.
 *
 * ⚠️ **Hooks SUGGEST, they never BLOCK.** Every path through this file must end in `exit 0` —
 * including when the CLI is missing, the model has a syntax error, or the JSON is malformed.
 * A hook that blocks wrongly once is a hook that gets removed, and once removed nobody turns
 * it back on, so a removed defence is a defence worth zero.
 *
 * ⚠️ **Say nothing when there is nothing to say.** A line printed on every turn that carries
 * no information teaches the user to skim past the one label we need them to read.
 */
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

/** Read the hook payload from stdin. Malformed ⇒ empty object, never a throw. */
function readInput() {
  try { return JSON.parse(fs.readFileSync(0, 'utf-8') || '{}'); } catch { return {}; }
}

/** Repo root: the nearest ancestor directory containing `.ds/`. */
function findRepo(from) {
  let dir = path.resolve(from || process.cwd());
  for (;;) {
    if (fs.existsSync(path.join(dir, '.ds'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

/**
 * Run the CLI inside the repo.
 *
 * The search order, and the order matters:
 *   1. `cli` from `.ds/config.json` — the ABSOLUTE path of the binary that ran `dspec init`.
 *      ⚠️ This is FIRST because PATH is the thing most likely to be missing. A hook is a spawned
 *      process, and a version manager (nvm, fnm, asdf) puts `node` and `dspec` on PATH from a
 *      shell startup file that a spawned process never reads. Without this branch all three hooks
 *      go permanently silent while the user believes they are running.
 *   2. `node_modules/.bin/dspec` — a project-local install.
 *   3. `dspec` on PATH — the ordinary case after `npm i -g dspec`.
 *   4. `ds`, the second binary name, for anyone whose muscle memory kept it.
 *
 * **Never use `npx`** on any branch: it may go and download a package in the middle of a hook
 * that runs after every single file edit.
 */
/**
 * How the CLI was reached last time `ds()` ran — `null` until it has.
 *
 * ⚠️ Kept so the ADVICE can match the installation. `work` prints hints like
 * `→ ds compile`, which are correct for someone who installed the npm package and plain
 * wrong for someone who only installed the plugin: they have no `ds` on PATH, so the agent
 * reads the hint, runs it, and gets "command not found" from a tool that was working a second
 * ago. See `retarget`.
 */
let lastInvocation = null;

function ds(args, cwd, timeout = 5000) {
  let bin = null;
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(cwd, '.ds', 'config.json'), 'utf-8'));
    if (cfg && cfg.cli && fs.existsSync(cfg.cli)) bin = cfg.cli;
  } catch { /* absent or unreadable — try the next candidate */ }
  if (!bin) {
    const local = path.join(cwd, 'node_modules', '.bin', 'dspec');
    bin = fs.existsSync(local) ? local : 'dspec';
  }
  const cmd = bin.endsWith('.js') ? process.execPath : bin;
  const argv = bin.endsWith('.js') ? [bin, ...args] : args;
  // Only a bundled/absolute `.js` needs spelling out. A `ds` found on PATH is already what
  // the hints say, and rewriting it to an absolute path would make correct advice look strange.
  lastInvocation = bin === 'dspec' ? null : (bin.endsWith('.js') ? `node "${bin}"` : bin);
  try {
    return execFileSync(cmd, argv, { cwd, timeout, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) {
    // A non-zero exit can still carry valid stdout — `dspec sync --strict` exits 1 when it FINDS something.
    return (e && e.stdout) || '';
  }
}

/**
 * Rewrite `dspec <cmd>` in advice so it names the CLI this installation actually has.
 *
 * A no-op when `dspec` is on PATH, which is the ordinary case and what the text is written for.
 *
 * ⚠️ **The verb list is read from the CLI that ships beside this file, never hand-kept here.**
 * The copy that used to live inline still named `compile` and `map` two command rewrites after
 * they were deleted. If the CLI cannot be loaded the answer is an empty list — the text then
 * passes through unrewritten, which is wrong but harmless, where rewriting a verb that no longer
 * exists tells the agent to run something that fails.
 */
/**
 * Load a module out of the installed dspec — `dist/model/load.js`, say.
 *
 * ⚠️ **The hooks no longer sit inside dspec.** They are copied into the user's `.claude/hooks/`,
 * so `../dist/` resolves to `.claude/dist/`, which does not exist. That mistake is SILENT: the
 * `require` throws, the hook catches it and exits 0, and the user sees a hook that has quietly
 * stopped working. Every path into dspec's own code has to go through here.
 *
 * ⚠️ **`root` is READ, never derived from `cli`.** After `npm i -g dspec`, `cli` is
 * `<prefix>/bin/dspec` — a symlink npm made — and its grandparent `<prefix>` holds no `dist/`; the
 * package is at `<prefix>/lib/node_modules/dspec`. Deriving the root from `cli` therefore works in
 * a checkout and fails on every real install, which is the worst way for a bug to behave.
 * `realpath` on `cli` is kept as the fallback for a `config.json` an older dspec wrote.
 */
function dspecModule(cwd, ...parts) {
  const roots = [];
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(cwd, '.ds', 'config.json'), 'utf-8'));
    if (cfg && cfg.root) roots.push(cfg.root);
    if (cfg && cfg.cli) roots.push(path.join(path.dirname(fs.realpathSync(cfg.cli)), '..'));
  } catch { /* absent, unreadable, or a dangling path — try the next candidate */ }
  roots.push(path.join(cwd, 'node_modules', 'dspec'));
  for (const root of roots) {
    try {
      return require(path.join(root, ...parts));
    } catch { /* not this one */ }
  }
  return null;
}

function verbs() {
  // ⚠️ Read from the CLI that is actually installed, never a copy typed here. The inline list this
  // replaced still named `compile` and `map` two command rewrites after both were deleted, and a
  // verb the CLI does not have is one this would happily rewrite into a command that fails.
  const cli = dspecModule(process.cwd(), 'dist', 'cli', 'index.js');
  return (cli && cli.VERBS) || [];
}

function retarget(text) {
  if (!text || !lastInvocation) return text;
  const list = verbs();
  if (!list.length) return text;
  return text.replace(new RegExp(`\\bdspec (${list.join('|')})\\b`, 'g'), `${lastInvocation} $1`);
}

/** Context added to the session — read by the agent. */
function emitContext(eventName, text) {
  if (text) process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: eventName, additionalContext: retarget(text) },
  }));
  process.exit(0);
}

/** One line for a HUMAN to read in the terminal. */
function emitMessage(text) {
  if (text) process.stdout.write(JSON.stringify({ systemMessage: retarget(text) }));
  process.exit(0);
}

module.exports = { readInput, findRepo, ds, dspecModule, emitContext, emitMessage };
