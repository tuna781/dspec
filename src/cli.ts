/**
 * dspec CLI — one command, and everything runs locally.
 *
 * ⚠️ **`init` is the whole terminal surface, and that is the design.** dspec is not a workflow and
 * owns no process: it installs `/ds-bootstrap` into your agents and teaches them to read `.ds/`.
 * Reading a codebase and describing it is judgement, and judgement belongs to the agent — so
 * there is no verb here for it, and no verb that measures, lints or gates anything either.
 *
 * ⚠️ **No network call exists anywhere in this program.** Upgrading is `npm`'s job, which the user
 * already has; wrapping it in a `dspec update` bought a second way to type the same thing and the
 * only outbound request in the tool.
 */
import { packageVersion } from './pkgRoot';
import { cmdInit } from './init';
import { INVOKE } from './agents';

const USAGE = `dspec — your product's map lives in \`.ds/\`, and every agent reads it

  dspec init  [--agent a,b] [--all] [--yes]   install dspec into your AI coding agents:
                                              the ${INVOKE} command, and the instructions
                                              that teach them to use \`.ds/\`

Then, in your agent: \`${INVOKE}\` reads the codebase and writes the map. After that, any
question about the code is answered from \`.ds/\` instead of by re-reading the repository.

Every run of \`init\` rebuilds what dspec installed before, so upgrading is:

  npm i -g dspec@latest && dspec init

Nothing here touches the network, and nothing outside \`.ds/\`, your agents' command directories
and the dspec block in CLAUDE.md / AGENTS.md is ever written.`;

type Handler = (args: string[]) => number | Promise<number>;

const COMMANDS: Record<string, Handler> = { init: cmdInit };

/** The verb set, exported so any surface that names commands is checked against it. */
export const VERBS = Object.keys(COMMANDS);

export async function main(argv: string[]): Promise<number> {
  const [cmd, ...args] = argv;
  if (!cmd || cmd === '--help' || cmd === '-h' || cmd === 'help') {
    console.log(USAGE);
    return 0;
  }
  // A flag, not a verb: the number is the question people ask, and a health report nobody asked
  // for only makes the answer harder to find.
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
    // Plain message, no stack trace: a Node stack only pushes the one useful line off the screen.
    console.error(`✗ ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
}
