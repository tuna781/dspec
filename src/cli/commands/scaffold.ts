// ============================================================
// Proposing a first model from the code already here
//
// ⚠️ **It proposes; it never concludes.** A directory is an observed fact; a feature is a
// judgement about what the product does. So every file this writes is PROVISIONAL and says so in
// its own frontmatter, and the body is left **empty**.
//
// ⚠️ **The empty body is the point, not an omission.** An empty body reports as `no_body`, which
// is a worklist the user can work through. A body pre-filled with a transcription of the code
// reports as complete — which is a lie, and it also buries the very list that would have told
// them what still needs writing. Drafting bodies from leading comments once produced 130
// "complete" descriptions that restated their own function signatures.
// ============================================================

import * as fs from 'node:fs';
import * as path from 'node:path';
import { trackedSources } from '../../code/sources';
import { claims, type Model } from '../../model/types';
import { FEATURES_DIR, SPEC_DIR } from '../../model/load';
import { renderLanguageBlock } from '../../model/language';
import { humanise, slugify } from '../../text';

export interface Proposal {
  name: string;
  area: string;
  code: string[];
  /** Where it would be written, repo-relative. */
  file: string;
}

const dirOf = (rel: string): string => {
  const i = rel.lastIndexOf('/');
  return i === -1 ? '.' : rel.slice(0, i);
};

/**
 * One proposal per directory holding unclaimed source.
 *
 * A directory is the only grouping readable from a checkout without inventing intent. It is
 * almost certainly the wrong boundary — that is why the scaffolded file says so out loud, and why
 * the command that calls this puts the question to the user rather than deciding.
 */
export function proposeFeatures(repo: string, model: Model): Proposal[] {
  const claimed = claims(model.features);
  const taken = new Set(model.features.map((f) => slugify(f.name)));
  const byDir = new Map<string, string[]>();

  for (const rel of trackedSources(repo)) {
    if (claimed.has(rel)) continue;
    const d = dirOf(rel);
    byDir.set(d, [...(byDir.get(d) ?? []), rel]);
  }

  const out: Proposal[] = [];
  for (const [dir, files] of [...byDir.entries()].sort()) {
    const parts = dir === '.' ? ['core'] : dir.split('/');
    const name = humanise(parts[parts.length - 1]);
    const area = humanise(parts.length > 1 ? parts[parts.length - 2] : name);
    let slug = slugify(name);
    // A name collision is resolved by qualifying with the path, never by overwriting: two
    // features silently sharing a file is the shape that once wrote one feature's fingerprint
    // into another's file.
    if (taken.has(slug)) slug = slugify(parts.join(' '));
    if (taken.has(slug)) continue;
    taken.add(slug);
    out.push({ name, area, code: files.sort(), file: `${SPEC_DIR}/${FEATURES_DIR}/${slug}.md` });
  }
  return out;
}

/**
 * The scaffolded file.
 *
 * ⚠️ **Guidance lives in frontmatter comments, never in the body.** A body is rendered into the
 * index and read by every agent, so an instructional note there is billed on every call forever;
 * it would also silence `no_body`, the rule that makes this scaffold a worklist. The parser strips
 * these comments, and the first `dspec sync --write` that writes a stamp removes them — which is the
 * right lifetime.
 */
export function renderProposal(p: Proposal): string {
  return `---
name: ${p.name}
area: ${p.area}
code:
${p.code.map((c) => `  - ${c}`).join('\n')}
# entry: someFunction     # where to start reading
# uses: [Other feature]   # the features this one depends on, by name
# tests: [test/…]         # only tests you have actually READ
#
# PROVISIONAL — proposed from the directory \`${dirOf(p.code[0])}\`, which is NOT a feature.
# A feature is something a person would name. Merge, split and rename these before writing
# the body, then say what a read of the files above would NOT tell you.
# ${renderLanguageBlock('line')}
---
`;
}

/** Write proposals that do not already exist. Existing files are never touched. */
export function writeProposals(repo: string, proposals: Proposal[]): string[] {
  const written: string[] = [];
  for (const p of proposals) {
    const abs = path.join(repo, p.file);
    if (fs.existsSync(abs)) continue;
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, renderProposal(p), 'utf-8');
    written.push(p.file);
  }
  return written;
}
