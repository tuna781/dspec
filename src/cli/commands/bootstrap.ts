// ============================================================
// `dspec bootstrap` — create the model, once
//
// The one command that INVENTS feature files. It writes `.ds/` and proposes one provisional
// feature per directory of source, for the agent to turn into real ones.
//
// ⚠️ **It owns `.ds/` and nothing else.** Installing the slash commands is `dspec init`'s job, and
// keeping the two apart is what stops "set the tooling up" from silently carrying the power to
// invent a model — or the reverse.
//
// ⚠️ **It creates; `dspec sync` repairs.** Those were one command with a flag, which meant "set this
// repo up" and "the model has drifted, fix it" could not be told apart — and the second silently
// carried the first's power to scaffold.
//
// ⚠️ **It never deletes and never overwrites.** A model that already has features is left exactly
// as it is, with one line saying so: scaffolding over curated work buries it, and "never delete a
// feature" is a rule the tool does not get to break on the user's behalf. Redoing from zero is an
// explicit human act — remove `.ds/features/` yourself, then run this again.
//
// ⚠️ **It writes no BODY.** The CLI can see which files exist; it cannot see what they are for.
// dspec is a toolkit and the agent is the brain, so the structure is scaffolded here and the
// content is written by whoever can actually read the code.
// ============================================================

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import { FEATURES_DIR, GLOSSARY_FILE, PRODUCT_FILE, SPEC_DIR } from '../../model/load';
import { renderLanguageBlock } from '../../model/language';
import { parseFlags } from '../args';
import { plural } from '../../text';
import { canPrompt, confirm } from '../../install/prompt';
import { loadModel } from '../../model/load';
import { proposeFeatures, writeProposals } from './scaffold';
import { Tracker } from '../../install/tracker';

const PRODUCT_MD = (name: string) => `---
name: ${name}
---

<!-- What this product is, and who it is for. A few lines is enough. -->

Rules
<!-- The non-negotiable rules that outlive every feature: language, framework, database,
     conventions nobody may quietly break. Every agent reads these before any change,
     so keep the list short enough that they stay read. -->
`;

const GLOSSARY_MD = `# Glossary

<!-- What the words mean HERE. This is the half of Domain-Driven Design worth keeping:
     when two areas use one word differently, say both.

**Order** — in Checkout, the thing being paid for; in Fulfilment, the thing being shipped. -->
`;

const USAGE = `dspec bootstrap [<dir>] [--here] [--force] [--no-git] [--yes]

  Create the model. Writes \`.ds/\` and proposes one provisional feature per directory of source —
  every one with an EMPTY body, because only a reader of the code can say what a feature is for.

  A model that already has features is left untouched. Use \`dspec sync\` to repair one.

  --here      set up the current directory
  --force     install into a directory that is not empty
  --no-git    do not run \`git init\`
  --yes       never prompt`;

interface BootstrapFlags {
  here?: boolean;
  'no-git'?: boolean;
  force?: boolean;
  yes?: boolean;
  help?: boolean;
}

export async function cmdBootstrap(argv: string[]): Promise<number> {
  const { values, positionals } = parseFlags<BootstrapFlags>(argv, {
    here: { type: 'boolean' },
    // `parseArgs` has no automatic negation, so `no-git` is a real option name.
    'no-git': { type: 'boolean' },
    force: { type: 'boolean' },
    yes: { type: 'boolean', short: 'y' },
    help: { type: 'boolean', short: 'h' },
  });

  if (values.help) {
    console.log(USAGE);
    return 0;
  }

  const target = positionals[0];
  if (target && values.here) {
    console.error('✗ pick one: <dir> or --here');
    return 2;
  }

  // ---- target directory ------------------------------------------------
  let repo: string;
  let createdDir = false;
  if (target) {
    repo = path.resolve(process.cwd(), target);
    if (fs.existsSync(repo)) {
      // A `.ds/` already here means this is a RE-install, not an install over somebody
      // else's project. Blocking it would cost `init` the ability to run again — and running
      // again is exactly how a repo picks up a newer template.
      const initialised = fs.existsSync(path.join(repo, SPEC_DIR));
      if (!initialised && !isEmptyish(repo) && !values.force) {
        console.error(`✗ ${target} exists and is not empty — pass --force to install into it anyway`);
        return 2;
      }
    } else {
      fs.mkdirSync(repo, { recursive: true });
      createdDir = true;
    }
  } else if (values.here) {
    repo = process.cwd();
  } else if (fs.existsSync(path.join(process.cwd(), SPEC_DIR))) {
    // The repo already has a model, so this is a re-install and there is nothing to ask.
    repo = process.cwd();
  } else if (values.yes || !canPrompt()) {
    // Non-TTY: DO NOT guess. If a CI script mistypes `dspec init` at the root of a build
    // machine and we helpfully install there, the mistake lands outside any repo where
    // nobody will ever see it.
    console.error(`✗ needs <dir> or --here\n\n${USAGE}`);
    return 2;
  } else if (await confirm(`Set dspec up in ${process.cwd()}?`, false)) {
    repo = process.cwd();
  } else {
    console.error(`✗ cancelled\n\n${USAGE}`);
    return 2;
  }

  const t = new Tracker();
  t.add('dir', `directory ${path.relative(process.cwd(), repo) || '.'}`);
  t.add('git', 'git');
  t.add('model', `${SPEC_DIR}/`);
  t.done('dir', createdDir ? 'created' : 'already there');

  // ---- git -------------------------------------------------------------
  if (values['no-git']) t.skip('git', '--no-git');
  else if (fs.existsSync(path.join(repo, '.git'))) t.done('git', 'already a repo');
  else if (!hasGit()) t.skip('git', 'git not found on PATH');
  else {
    try {
      execFileSync('git', ['init', '-q'], { cwd: repo, stdio: 'ignore' });
      t.done('git', 'git init');
    } catch (err) {
      t.error('git', err instanceof Error ? err.message : String(err));
    }
  }

  // ---- model -----------------------------------------------------------
  const root = path.join(repo, SPEC_DIR);
  const seeded: string[] = [];
  writeIfMissing(path.join(root, PRODUCT_FILE), PRODUCT_MD(path.basename(repo)), seeded);
  writeIfMissing(path.join(root, GLOSSARY_FILE), GLOSSARY_MD, seeded);
  fs.mkdirSync(path.join(root, FEATURES_DIR), { recursive: true });
  t.done('model', seeded.length ? plural(seeded.length, 'file') : 'already there, untouched');

  ensureGitignore(repo);

  t.finish();

  // ---- propose the features --------------------------------------------
  //
  // ⚠️ Only into a model with none. Once a person has written even one feature, a proposal per
  // directory would bury what they curated — and which files deserve a feature is their judgement,
  // not something readable from a directory listing.
  const { model } = loadModel(repo);
  if (model.features.length) {
    console.log(`\n· ${plural(model.features.length, 'feature')} already described — nothing scaffolded.`);
    console.log('  `dspec sync` repairs an existing model. To start over, remove `.ds/features/` first.');
    return 0;
  }

  const written = writeProposals(repo, proposeFeatures(repo, model));
  if (!written.length) {
    console.log('\n· no source files found to propose features from — write `.ds/features/*.md` by hand.');
    return 0;
  }

  console.log(`\n✓ proposed ${plural(written.length, 'feature')} from the code here:`);
  for (const f of written.slice(0, 10)) console.log(`  + ${f}`);
  if (written.length > 10) console.log(`  … +${written.length - 10} more`);

  // The scaffold is a QUESTION, not an answer, and the closing words have to say so — a user who
  // reads "done" here ships a model that names directories instead of features.
  console.log(`
Every name is provisional and every body is EMPTY. A directory is an observed fact; a
feature is something a person would name. Next:

  1. merge, split and rename them into features, fixing each \`code:\` list
  2. for each one, write what a read of its files would NOT tell you
  3. dspec sync --write    fingerprint them and render the index`);
  return 0;
}

function rel(repo: string, p: string): string {
  return path.relative(repo, p) || p;
}

/** "Effectively empty": a directory holding only `.git` still counts — people run `git init` first. */
function isEmptyish(dir: string): boolean {
  try {
    return fs.readdirSync(dir).filter((e) => e !== '.git' && e !== '.DS_Store').length === 0;
  } catch {
    return true;
  }
}

function hasGit(): boolean {
  try {
    execFileSync('git', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function writeIfMissing(file: string, content: string, log: string[]): void {
  if (fs.existsSync(file)) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf-8');
  log.push(file);
}

/**
 * Keep `.ds/config.json` out of git.
 *
 * dspec no longer WRITES that file — it used to record the absolute path of the CLI, and a
 * plugin is cached under a path carrying its version, so the recorded path is wrong the moment
 * anybody runs `/plugin update`. The ignore line stays because repos installed by an older
 * dspec still have the file, and it is still machine-specific. The rest of `.ds/` MUST be
 * committed: the model travelling with the code is the entire idea.
 */
function ensureGitignore(repo: string): void {
  const gi = path.join(repo, '.gitignore');
  const line = `${SPEC_DIR}/config.json`;
  let body = '';
  try {
    body = fs.readFileSync(gi, 'utf-8');
  } catch {
    /* not there yet */
  }
  if (body.split('\n').some((l) => l.trim() === line)) return;
  fs.writeFileSync(gi, (body && !body.endsWith('\n') ? body + '\n' : body) + line + '\n', 'utf-8');
}

/**
 * Contexts whose compiled rule file would land on top of a rule the user wrote themselves.
 *
 * Only UNSTAMPED files count as a clash: a `.claude/rules/ordering.md` that dspec generated on
 * the last compile is not a collision, it is the artifact being kept up to date. Reporting it
 * would put a warning on every single install of a healthy repo, and a warning that is always
 * there is one nobody reads on the day it means something.
 */
