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

const USAGE = `dspec — your agent answers from what your product is, not from what it can grep

  dspec init  [--agent a,b]   install dspec into every AI coding agent it supports —
                              Claude Code, Codex CLI and Cursor: the ${INVOKE}
                              command, and the instructions that teach them to read \`.ds/\`.
                              It asks nothing

Then, in your agent: \`${INVOKE}\` reads the codebase and writes the map — what each feature
is, where it lives, what it does, and what a change must not break. After that,
a question about the code, or a plan to change it, starts from that map instead of from whatever a
search happened to turn up.

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
