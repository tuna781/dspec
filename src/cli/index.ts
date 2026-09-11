/**
 * dspec CLI — the product model is files in the repo, and everything runs locally.
 *
 * No network configuration, no token, no background process: every command reads `.ds/` and, when
 * it matters, the actual source in the checkout. That is the deepest design choice here — the CLI
 * stands INSIDE the repo, so "is this description still true?" is a question it answers by
 * measuring rather than by trusting what an agent reports.
 *
 * ⚠️ **One flat set, and every verb is a command the user knows by name.** This listing was once
 * split into "what you type" and "what the hooks call", which invited verbs that existed only
 * because something used to call them — `init`, `drift`, `doctor`, `pack`, `whose` and `check` all
 * survived that way, each overlapping a neighbour. There is one kind of command: if a user cannot
 * name it, it is not one, and its job belongs to a flag on a command they can name.
 *
 * ⚠️ **dspec is a toolkit; the brain is the agent using it.** Every verb below either MEASURES
 * something readable from the checkout or writes something mechanical. None of them decides what
 * a feature is, which files deserve one, or whether a description is still true — those are
 * judgements, and they belong to whoever can read the code.
 */
import { packageVersion } from '../pkgRoot';
import { cmdInit } from './commands/init';
import { cmdBootstrap } from './commands/bootstrap';
import { cmdSync } from './commands/sync';
import { cmdSpec } from './commands/spec';

const USAGE = `dspec — the product model lives in your repo, and is measured against it

  dspec init      [--agent a,b] [--all]      add the /ds-* commands to your AI coding agents, in
                                             each one's own syntax. Adds only; never overwrites
  dspec bootstrap [<dir>] [--here]           create the model: .ds/, and one provisional feature
                                             per directory of source
  dspec sync      [--write] [--strict]       repair an existing model: restore what is missing,
                                             re-stamp, re-render, and report what only you can settle
  dspec spec      "<Feature>" [--touch F]    what the model already knows about a piece of work

The model lives in \`.ds/\` at the repo root. Every command works from any subdirectory.
\`bootstrap\` creates and \`sync\` repairs — only those two write to \`.ds/\`. Nothing exits non-zero
unless you ask for it with \`sync --strict\`, which is what a CI job runs.

Every one of these is an ordinary terminal command, and the \`/ds-*\` slash commands \`init\` writes
are prose telling an agent which of them to run — so an agent can run any of this itself.`;

type Handler = (args: string[]) => number | Promise<number>;

const COMMANDS: Record<string, Handler> = {
  init: cmdInit,
  bootstrap: cmdBootstrap,
  sync: cmdSync,
  spec: cmdSpec,
};

/** The verb set, exported so the surfaces that name commands are checked against it rather than
 *  against a hand-kept copy. Two lists of verbs is how `compile` and `map` outlived the commands. */
export const VERBS = Object.keys(COMMANDS);

export async function main(argv: string[]): Promise<number> {
  const [cmd, ...args] = argv;
  if (!cmd || cmd === '--help' || cmd === '-h' || cmd === 'help') {
    console.log(USAGE);
    return 0;
  }
  // ⚠️ A flag, not a verb. `ds version` used to be a command that also ran health checks, and
  // it went the way of `doctor`, `drift` and `check`: the number is the question people ask, and
  // a report nobody asked for made the answer harder to find.
  if (cmd === '--version' || cmd === '-v') {
    console.log(packageVersion());
    return 0;
  }

  const handler = COMMANDS[cmd];
  if (!handler) {
    console.error(`no such command: ${cmd}\n\n${USAGE}`);
    return 2;
  }
  try {
    return await handler(args);
  } catch (err) {
    // Plain message, no stack trace: the most common error here is a model file with a syntax
    // mistake, and `YamlError` already carries the file name and the line number. A Node stack
    // trace only pushes that information off the screen.
    console.error(`✗ ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
}
