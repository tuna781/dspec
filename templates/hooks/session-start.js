#!/usr/bin/env node
'use strict';
/**
 * Open a session with "what is outstanding", not with a blank page.
 *
 * This replaces the user having to re-tell the context every time: what is in progress, how
 * far it got, what is unfinished. Without it, the agent has no way to know.
 */
const { readInput, findRepo, ds, emitContext } = require('./_ds');

const repo = findRepo(readInput().cwd);
if (!repo) process.exit(0);

const out = ds(['sync', '--brief'], repo, 10000).trim();
if (!out) process.exit(0);

emitContext('SessionStart',
  'This project keeps an internal product model in `.ds/` that you maintain: what each feature is, '
  + 'where it lives in the code, and what it depends on. The user never edits it — talk to them about '
  + 'features and behaviour, never about these files.\n\n'
  + '**Start at `.ds/index.md`** when you need to know what a feature is or where it lives, then read '
  + 'the one feature file you need.\n\n'
  + `Outstanding right now:\n${out}\n\n`
  + 'Resolve these as part of your work — "Keeping the product model current" in CLAUDE.md says how. '
  + '`dspec spec "<Feature name>"` gives what the model knows about a piece of work. Do not invent '
  + 'behaviour the model does not describe — read the code, or ask.');
