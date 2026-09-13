// ============================================================
// Has a rendered artifact fallen behind the model?
//
// ⚠️ **Answered by RE-RENDERING AND COMPARING CONTENT, never by a version number.** A number in a
// file is a claim the file makes about itself, and a hand-edited file still carries the old one.
// Re-rendering is the only check that cannot be fooled by the thing it is checking.
//
// ⚠️ **Every format, not just the root file.** The index is the entry point; a stale index sends
// every reader to the wrong place while `CLAUDE.md` looks perfectly current.
// ============================================================

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Model } from '../model/types';
import { memoryFilesFor } from '../install/agents';
import { extractBlock, parseArtifactStamp, renderAll, stampMatches, withoutStamp } from './renderers';

export interface StaleArtifact {
  path: string;
  reason:
    /** The model renders it, and it is not on disk. */
    | 'missing'
    /** The content no longer matches a fresh render. */
    | 'behind'
    /** Stamped by a different project — copied in from another repo. */
    | 'foreign';
  detail: string;
}

export interface ArtifactReport {
  stale: StaleArtifact[];
  /**
   * Present on disk, carrying no stamp, and not dspec's to own ⇒ hand-written. Only the managed
   * block inside it is checked; the rest is somebody's and is nobody's business here.
   */
  unstamped: string[];
}

export function checkArtifacts(repo: string, model: Model): ArtifactReport {
  const stale: StaleArtifact[] = [];
  const unstamped: string[] = [];
  // ⚠️ **Which memory files exist is DERIVED from the checkout, never stored.** A repo that has
  // both `CLAUDE.md` and `AGENTS.md` is one somebody installed two agents into; a repo with
  // neither is a fresh one, and gets `CLAUDE.md` — which is what every model written before
  // adapters already has, so nothing regresses.
  const fresh = renderAll(model, { projectId: model.product.name }, memoryFilesFor(repo));

  for (const file of fresh) {
    const abs = path.join(repo, file.file);
    if (!fs.existsSync(abs)) {
      stale.push({ path: file.file, reason: 'missing', detail: 'has never been rendered — run `dspec sync --write`' });
      continue;
    }
    const onDisk = fs.readFileSync(abs, 'utf-8');
    const parsed = parseArtifactStamp(onDisk);
    if (!parsed) {
      // ⚠️ Reported, never overwritten by the check. Finding a file dspec does not own under a name
      // it renders is worth saying — and for the index, saying it is all this may do.
      unstamped.push(file.file);
      if (file.block === undefined) continue;
      // A memory file somebody wrote. Only the block between the markers is dspec's.
      const block = extractBlock(onDisk);
      if (block === null) {
        stale.push({
          path: file.file,
          reason: 'missing',
          detail: 'is hand-written and has no dspec block — `dspec sync --write` adds one and leaves the rest untouched',
        });
      } else if (block.trim() !== file.block.trim()) {
        stale.push({ path: file.file, reason: 'behind', detail: 'dspec block has fallen behind the model — run `dspec sync --write`' });
      }
      continue;
    }
    if (!stampMatches(parsed, model.product.name)) {
      stale.push({
        path: file.file,
        reason: 'foreign',
        detail: `generated from a different project (\`${parsed.projectId}\`) — copied in from another repo?`,
      });
      continue;
    }
    if (withoutStamp(onDisk).trim() !== withoutStamp(file.content).trim()) {
      stale.push({ path: file.file, reason: 'behind', detail: 'has fallen behind the model — run `dspec sync --write`' });
    }
  }

  return { stale, unstamped };
}
