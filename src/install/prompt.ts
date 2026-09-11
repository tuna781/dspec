// ============================================================
// Asking the user things — and the rule that governs all of it
//
// ⚠️ **Never ask when asking is not allowed.** An `npx dspec init` that hangs in CI waiting for
// a keypress is a far worse failure than a skipped question: it reports nothing and times out
// ten minutes later. `--yes` and a non-TTY stdin are both checked by the caller, and `confirm`
// is only reached when neither applies.
//
// ============================================================

import * as readline from 'node:readline/promises';

export interface PickOptions {
  input?: NodeJS.ReadStream;
  output?: NodeJS.WriteStream;
}

/** Are we allowed to open an interactive prompt? */
export function canPrompt(input: NodeJS.ReadStream = process.stdin): boolean {
  return Boolean(input.isTTY);
}

/**
 * A one-line yes/no question.
 *
 * Only called when `canPrompt()` — for the reason at the top of this file. An empty Enter takes
 * `def`, so a terminal that returns EOF immediately still does not hang.
 */
export async function confirm(question: string, def: boolean, opts: PickOptions = {}): Promise<boolean> {
  const rl = readline.createInterface({ input: opts.input ?? process.stdin, output: opts.output ?? process.stdout });
  try {
    const answer = (await rl.question(`${question} ${def ? '[Y/n]' : '[y/N]'} `)).trim().toLowerCase();
    if (!answer) return def;
    return answer === 'y' || answer === 'yes';
  } finally {
    rl.close();
  }
}

export interface Choice {
  key: string;
  label: string;
  /** Ticked when the question is first shown. */
  preselected: boolean;
  /** One line under the label — what choosing this actually does. */
  note?: string;
}

/**
 * Pick several from a list, by typing numbers.
 *
 * ⚠️ **Numbers, not arrow keys.** A cursor-driven picker needs raw mode, and raw mode on a
 * terminal that does not support it leaves the user's shell without an echo after we exit. Typing
 * `1,3` works over ssh, inside tmux, in a CI terminal that claims to be a TTY, and in every
 * editor's embedded shell — and it costs one line of explanation.
 *
 * Empty input takes the preselected set, so Enter is always a safe answer. `all` and `none` are
 * accepted because they are what people type.
 */
export async function pick(question: string, choices: Choice[], opts: PickOptions = {}): Promise<string[]> {
  const out = opts.output ?? process.stdout;
  const rl = readline.createInterface({ input: opts.input ?? process.stdin, output: out });
  const preselected = choices.filter((c) => c.preselected).map((c) => c.key);
  try {
    out.write(`\n${question}\n\n`);
    choices.forEach((c, i) => {
      out.write(`  ${i + 1}. ${c.preselected ? '[x]' : '[ ]'} ${c.label}\n`);
      if (c.note) out.write(`        ${c.note}\n`);
    });
    const hint = preselected.length ? `Enter for ${preselected.join(', ')}` : 'Enter for none';
    const answer = (await rl.question(`\nNumbers, comma separated — \`all\`, \`none\`, or ${hint}: `)).trim().toLowerCase();

    if (!answer) return preselected;
    if (answer === 'none') return [];
    if (answer === 'all') return choices.map((c) => c.key);

    const chosen: string[] = [];
    for (const part of answer.split(/[,\s]+/).filter(Boolean)) {
      // A name is accepted as readily as a number: somebody who types `codex` meant `codex`,
      // and telling them off for it would be pedantry.
      const byName = choices.find((c) => c.key === part);
      const byNumber = /^\d+$/.test(part) ? choices[Number(part) - 1] : undefined;
      const hit = byName ?? byNumber;
      if (hit && !chosen.includes(hit.key)) chosen.push(hit.key);
    }
    return chosen;
  } finally {
    rl.close();
  }
}
