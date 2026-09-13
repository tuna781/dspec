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

// ⚠️ Only drift: a description older than its code. `/ds-sync` walks through reading each one and
// accepting it. A lost file or a missing test is reported by `dspec sync` itself; offering it here
// as "changed code" would describe something that did not happen.
const stale = staleness.filter((d) => d.kind === 'stale');
if (!stale.length) process.exit(0);

const names = stale.slice(0, 3).map((d) => d.feature).join(', ');
emitMessage(
  `dspec: ${stale.length} feature description(s) older than their code (${names}${stale.length > 3 ? '…' : ''}). `
  + 'Run `/ds-sync` to read each one and bring the model back in step.');
