// `dspec spec "<Feature>"` — what the model already knows about a piece of work.
//
// The measurement behind `/ds:spec` and `/ds:plan`. It resolves a NAME and never guesses: see the header
// of `compile/pack.ts` for the failure that rule exists to prevent.
import { loadModel } from '../../model/load';
import { renderPack } from '../../compile/pack';
import { csv, parseFlags } from '../args';
import { findRepo } from '../repo';

const USAGE = `dspec spec "<Feature>" [--touch <Feature>]

  What the model knows about a piece of work: the product rules, the feature named, the features
  it uses, the files bound to them, and an explicit warning wherever the model is too thin to
  trust.

  Retrieval resolves NAMES, never word overlap. A request naming no feature is told so, and the
  index is printed for you to choose from.

  --touch <Feature>   pull a feature in by name (repeatable, or comma-separated)`;

export function cmdSpec(args: string[]): number {
  const { values, positionals } = parseFlags<{ touch?: string[]; help?: boolean }>(args, {
    touch: { type: 'string', multiple: true },
    help: { type: 'boolean' },
  });
  const request = positionals.join(' ').trim();
  if (values.help || !request) { console.log(USAGE); return request ? 0 : 2; }

  const repo = findRepo();
  const { model } = loadModel(repo);
  console.log(renderPack(repo, model, request, { touch: csv(values.touch) }));
  return 0;
}
