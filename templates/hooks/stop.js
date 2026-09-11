#!/usr/bin/env node
'use strict';
/**
 * Leaving a session with the model behind the code ⇒ offer to sync, EXACTLY ONCE.
 *
 * ⚠️ **This is the hook that reaches the user who never types a slash command.** The loop is
 * code-first — describe, plan, build, then sync — and most of the time the first three of those
 * happen as ordinary chat. This is the moment that closes it, whether or not anybody ran
 * `/ds-plan`.
 *
 * ⚠️ It is a `systemMessage` for a HUMAN, not context for the agent, and it blocks nothing. A
 * gate here would teach people to click past it; an honest offer does not — and if it becomes
 * annoying, the thing to fix is the code map, not the hook.
 */
const { readInput, findRepo, ds, emitMessage } = require('./_ds');

const repo = findRepo(readInput().cwd);
if (!repo) process.exit(0);

// ⚠️ One caller, one definition of "stale". This used to ask `ds drift --json` — a verb that
// existed only for this hook, answering a question another command already answered. Two commands
// deciding separately what counts as stale is how they come to disagree.
let staleness = [];
try { staleness = JSON.parse(ds(['sync', '--json'], repo, 8000) || '{}').staleness || []; } catch { process.exit(0); }

// ⚠️ These two kinds, and only these two, are the ones `dspec sync --write` can actually resolve.
// Offering sync for a lost file or a missing test would send the user to a command that cannot
// help, which is how a reminder becomes something people dismiss without reading.
const stale = staleness.filter((d) => d.kind === 'stale' || d.kind === 'unmeasured');
if (!stale.length) process.exit(0);

const names = stale.slice(0, 3).map((d) => d.feature).join(', ');
emitMessage(
  `dspec: ${stale.length} feature(s) describing code that just changed (${names}${stale.length > 3 ? '…' : ''}). `
  + 'Run `/ds-sync` to bring the model back in step with the code.');
