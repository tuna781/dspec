// ============================================================
// Writing the one field the CLI owns
//
// ⚠️ **`stamp` and nothing else.** Everything a person wrote stays exactly as they wrote it. The
// CLI re-measures; only a person may re-decide. In particular this never writes `tests:` —
// guessing that `drift.ts` is proven by `drift.test.js` turns *"nobody proved this"* into *"this
// is proven"*, the dangerous direction, and it fails silently because the warning switches off
// exactly when it is most needed.
//
// ⚠️ Rewriting frontmatter drops `#` comments, because the serialiser is the inverse of the
// parser and the parser strips them. That is the intended lifetime for a scaffolding note: it is
// there while the feature is unwritten, and gone once it has been measured.
// ============================================================

import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseDoc, renderDoc } from '../../model/frontmatter';
import { stampFiles } from '../../code/hash';
import type { Model, SourceOf } from '../../model/types';

export interface StampReport {
  updated: string[];
  unchanged: number;
  /** Features whose stamp could not be computed, with the reason. */
  skipped: string[];
}

export function writeStamps(repo: string, model: Model, sourceOf: SourceOf, write: boolean): StampReport {
  const report: StampReport = { updated: [], unchanged: 0, skipped: [] };
  // One read per file for the whole run: several features routinely claim one file.
  const cache = new Map<string, string>();

  for (const feature of model.features) {
    if (!feature.code.length) continue;
    // ⚠️ **A feature with no body is not stamped.** A stamp asserts "this description is current
    // for this code", and a description that says nothing cannot be current — stamping it would
    // make an empty file report as measured and fine, which is the "unmeasured must never look
    // fine" rule turned exactly inside out.
    //
    // It also gives the scaffolding comments a life. They are stripped whenever frontmatter is
    // rewritten, so stamping a freshly scaffolded feature in the same run erased the guidance
    // before the user ever opened the file.
    if (!feature.lead.trim()) continue;
    const { stamp, missing } = stampFiles(repo, feature.code, cache);
    if (!stamp) {
      report.skipped.push(`${feature.name}: ${missing.length ? `${missing.join(', ')} not on disk` : 'nothing to fingerprint'}`);
      continue;
    }
    if (feature.stamp === stamp) { report.unchanged++; continue; }

    const rel = sourceOf.get(feature);
    if (!rel) continue;
    const abs = path.join(repo, rel);
    const doc = parseDoc(fs.readFileSync(abs, 'utf-8'), rel);
    doc.meta.stamp = stamp;
    if (write) fs.writeFileSync(abs, renderDoc(doc), 'utf-8');
    report.updated.push(rel);
  }

  return report;
}
