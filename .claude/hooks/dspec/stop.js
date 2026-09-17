#!/usr/bin/env node
'use strict';
/**
 * Before the agent ends a turn: is the product model still true of the code? If not, it finishes the
 * job first.
 *
 * ⚠️ **This is what makes the model maintain itself.** Nobody has to remember a command. When the
 * turn changed code and left a description older than its code, a claimed file gone, a feature
 * with no description, or new source no feature claims, the agent is asked — once — to bring the
 * model up to date before it hands back.
 *
 * ⚠️ **Once per stop, never a loop.** Claude Code sets `stop_hook_active` when a turn is already
 * continuing because of a Stop hook; then this only leaves a note. Undescribed code that was
 * undescribed BEFORE this work is not counted: that is `/ds-bootstrap`'s job, and dumping a repo's
 * old debt on every turn would make each one endless.
 */
const { readInput, findRepo, ds, emitMessage, emitContinue } = require('./_ds');

const input = readInput();
const repo = findRepo(input.cwd);
if (!repo) process.exit(0);

let report = {};
try { report = JSON.parse(ds(['sync', '--json'], repo, 8000) || '{}'); } catch { process.exit(0); }

// ⚠️ One definition of "stale", read from the CLI — never re-decided here.
const OWED = new Set(['stale', 'code_missing', 'entry_lost']);
const owed = [
  ...(report.staleness || []).filter((s) => OWED.has(s.kind)).map((s) => `${s.feature}: ${s.detail}`),
  ...(report.items || []).filter((i) => i.kind === 'quality').map((i) => i.title),
  ...(report.changedUnclaimed || []).map((f) => `no feature claims ${f}`),
  ...(report.items || []).filter((i) => i.kind === 'artifact').map((i) => i.title),
];
if (!owed.length) process.exit(0);

if (input.stop_hook_active) {
  emitMessage(`dspec: the product model still owes ${owed.length} update(s) — /ds-bootstrap catches it up.`);
}

const shown = owed.slice(0, 8).map((o) => `- ${o}`).join('\n');
emitContinue(
  'Before you finish: the product model is behind the code.\n'
  + `${shown}${owed.length > 8 ? `\n- … +${owed.length - 8} more (dspec sync)` : ''}\n\n`
  + 'Bring it up to date now, without asking the user — follow "Keeping the product model current" in '
  + 'CLAUDE.md: read each description and its code, rewrite the description, `dspec accept "<Feature>"`; '
  + 'claim new files or add a feature (`dspec sync --guide` first); `dspec sync --write`; '
  + '`dspec sync --strict` clean. Then tell the user in one line which features you updated.');
// dspec:managed
