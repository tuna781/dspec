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
  'This repository is modelled in dspec at `.ds/`, and the model is the source of truth for what '
  + 'each feature is, where it lives in the code, and what it depends on. What `CLAUDE.md` says about '
  + 'the model is generated from it — never edit that part by hand.\n\n'
  + '**Start at `.ds/index.md`**: one read gives every feature, what it is, and which files it '
  + 'occupies. Then read the one feature file you need — not the whole model, and not `CLAUDE.md`.\n\n'
  + `Outstanding right now:\n${out}\n\n`
  + 'Run `dspec spec "<Feature name>"` for what the model knows about a piece of work; it resolves '
  + 'names, so if it says the model does not name your request, pick from the list it prints '
  + 'rather than searching the source. Before relying on a feature listed above, read it; `/ds-sync` '
  + 'shows the full picture. Do not invent behaviour the model does not describe — read the feature file, or ask.');
