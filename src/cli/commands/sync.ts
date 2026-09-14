// ============================================================
// `dspec sync` — create the model when there is none, repair it when there is
//
// It reconciles in BOTH directions and fixes what is safe to fix:
//
//   model → code   `computeStaleness`  a description naming code that moved, vanished or changed
//   code → model   `computeCoverage`   source files nothing in the model describes
//   model quality  `buildWorkList`     features with no body, artifacts that have fallen behind
//
// ⚠️ **A missing `.ds/` is not refused, it is the first thing `--write` builds.** This used to be
// two commands — `bootstrap` created, `sync` repaired — split apart so "set this repo up" and "the
// model has drifted" could not be told apart. In practice a user only ever had one question,
// "is `.ds/` in step with the code", and had to already know which command answered it. `sync`
// now asks `hasModel()` itself: nothing there yet → seed the base files and propose one
// provisional feature per directory of source; something there → repair it. Same command either
// way, because the code path that restores a missing `product.md` and the one that writes it for
// the first time were always the same code path.
//
// ⚠️ **It never invents a feature once one exists.** Proposing is a first-run act only — the
// moment a person has named even one feature, undescribed code is LISTED, never scaffolded: which
// files deserve a feature is a judgement, and a command that quietly answered it would fill a
// curated model with directories.
//
// ⚠️ **`--write` RE-MEASURES; it does not rewrite prose.** It restores missing base files, writes
// stamps and re-renders artifacts — all mechanical and reproducible. It never edits a body to
// agree with the code and never deletes a feature: a description the code has overtaken is where
// the CODE is the unreviewed party, and silently rewriting it would discard a decision somebody
// made.
//
// ⚠️ **It exits non-zero only when asked, with `--strict`.** That flag is the CI gate and nothing
// else turns it on: a command that failed by default would make every other use of it a hazard —
// and a gate nobody opted into is one people route around.
// ============================================================

import * as fs from 'node:fs';
import * as path from 'node:path';
import { FEATURES_DIR, GLOSSARY_FILE, PRODUCT_FILE, SPEC_DIR, hasModel, loadModel } from '../../model/load';
import { computeCoverage, type Coverage } from '../../code/coverage';
import { computeStaleness, type StaleItem } from '../../code/staleness';
import { lintRepo, SEVERITY, type Finding } from '../../compile/lint';
import { checkArtifacts } from '../../compile/artifacts';
import { lintLine, MARK } from '../lintMessage';
import { buildWorkList, type WorkItem } from '../../compile/worklist';
import { memoryFilesFor } from '../../install/agents';
import { renderAll } from '../../compile/renderers';
import { proposeFeatures, writeProposals } from './scaffold';
import { findRepo } from '../repo';
import { plural } from '../../text';
import { writeStamps } from './stamp';

export interface SyncReport {
  items: WorkItem[];
  coverage: Coverage;
  /** Base files this run put back. Empty whenever the model is intact. */
  restored: string[];
  /** Every measured disagreement between a description and its code. Read by the Stop hook. */
  staleness: StaleItem[];
  findings: Finding[];
}

export interface SyncOptions {
  /** Skip the checkout walk — the slowest half. The session hook cannot afford it. */
  skipCode?: boolean;
}

export function buildSyncReport(repo: string, opts: SyncOptions = {}): SyncReport {
  const { model } = loadModel(repo);
  return {
    items: buildWorkList(repo, model, { skipCode: opts.skipCode }),
    coverage: opts.skipCode
      ? { dirs: [], unclaimed: 0, claimed: 0, total: 0, extra: 0 }
      : computeCoverage(repo, model),
    restored: [],
    staleness: opts.skipCode ? [] : computeStaleness(repo, model),
    findings: opts.skipCode ? [] : lintRepo(repo, model),
  };
}

/**
 * The failures a CI run should stop on — measured facts only, never an opinion.
 *
 * ⚠️ **Code without a description is NOT one of them**, and neither is a body nobody has written
 * yet. A gate that reddens on every new file teaches people to route around it, and then the model
 * rots with the gate still green. Nor is "never measured": that means nothing is known yet, and
 * failing on it would conflate *unknown* with *wrong* — the one distinction this tool exists to
 * keep.
 */
export function failures(repo: string, report: SyncReport): string[] {
  const { model } = loadModel(repo);
  return [
    ...report.findings.filter((f) => SEVERITY[f.code] === 'error').map((f) => lintLine(f)),
    ...report.staleness.filter((s) => s.kind === 'stale').map((s) => `${s.feature} — ${s.detail}`),
    ...checkArtifacts(repo, model).stale.map((a) => `${a.path} ${a.detail}`),
  ];
}

/**
 * The code→model half, rendered.
 *
 * ⚠️ It says **decide**, not **add**. Not every file deserves a feature — a helper module
 * described in the model is noise that buries the features that matter — and which of them is
 * worth writing down is exactly the judgement this command has no way to make.
 */
export function reportCoverage(coverage: Coverage): void {
  if (!coverage.unclaimed) return;
  console.log(`\nCode no feature describes — ${plural(coverage.unclaimed, 'file')} in ${plural(coverage.dirs.length, 'directory', 'directories')}:`);
  for (const d of coverage.dirs) {
    console.log(`  ${d.dir}  ${d.unclaimed}/${d.total}`);
    const rest = d.unclaimed - d.shown.length;
    console.log(`    ${d.shown.map((f) => f.split('/').pop()).join(', ')}${rest > 0 ? `, +${rest} more` : ''}`);
  }
  console.log('\n  Decide which of these are real features worth describing — most are not.');
}

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

/**
 * Put back the files the model cannot be read without — including all of them, the first time.
 *
 * ⚠️ **Only ones that are ABSENT.** A file the user has written is never touched, whatever it
 * says — repairing a model must not mean overwriting the part of it somebody cared about. A
 * repo with no `.ds/` at all restores every one of them, which is indistinguishable from creating
 * it: there is no separate "first run" code path.
 */
function restoreMissing(repo: string): string[] {
  const root = path.join(repo, SPEC_DIR);
  const restored: string[] = [];
  const put = (rel: string, body: string) => {
    const abs = path.join(root, rel);
    if (fs.existsSync(abs)) return;
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body, 'utf-8');
    restored.push(`${SPEC_DIR}/${rel}`);
  };
  put(PRODUCT_FILE, PRODUCT_MD(path.basename(path.resolve(repo))));
  put(GLOSSARY_FILE, GLOSSARY_MD);
  fs.mkdirSync(path.join(root, FEATURES_DIR), { recursive: true });
  return restored;
}

export function cmdSync(args: string[]): number {
  const write = args.includes('--write');
  const json = args.includes('--json');
  const brief = args.includes('--brief');
  // ⚠️ **The only way this command exits non-zero**, and it is opt-in. A pipeline chooses its own
  // strictness; a command that failed by default would make every other use of it a hazard.
  const strict = args.includes('--strict');
  const repo = findRepo();
  const hadModel = hasModel(repo);

  if (!hadModel && !write) {
    // Nothing to repair and nothing written yet — say what would create it, rather than either
    // refusing (there is nothing wrong here) or creating on a dry run (`--write` is the only
    // thing that ever writes).
    console.log(`· no \`${SPEC_DIR}/\` here yet — run \`dspec sync --write\` to create one`);
    return 0;
  }

  const restored: string[] = [];
  const proposed: string[] = [];
  if (write) {
    restored.push(...restoreMissing(repo));

    // Proposing is a first-run act only. Once a person has named even one feature, undescribed
    // code is reported by `computeCoverage` below, never scaffolded — see the header.
    if (!hadModel) {
      const { model } = loadModel(repo);
      proposed.push(...writeProposals(repo, proposeFeatures(repo, model)));
    }

    // Order matters: stamp first, render second. Rendering before stamping would stamp an
    // artifact from values that are about to change.
    const loaded = loadModel(repo);
    const stamps = writeStamps(repo, loaded.model, loaded.sourceOf, true);
    const fresh = loadModel(repo).model;
    for (const file of renderAll(fresh, { projectId: fresh.product.name, generatedAt: new Date().toISOString() }, memoryFilesFor(repo))) {
      const abs = path.join(repo, file.file);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, file.content, 'utf-8');
    }

    for (const r of restored) console.log(`✓ restored ${r}`);
    if (!hadModel && !proposed.length) {
      console.log('· no source files found to propose features from — write `.ds/features/*.md` by hand.');
    } else if (proposed.length) {
      console.log(`✓ proposed ${plural(proposed.length, 'feature')} from the code here:`);
      for (const p of proposed.slice(0, 10)) console.log(`  + ${p}`);
      if (proposed.length > 10) console.log(`  … +${proposed.length - 10} more`);
      // Every name is PROVISIONAL and every body is EMPTY — a directory is an observed fact, not a
      // feature. The worklist below will say each one has no body; this says what to do about it.
      console.log('  Every name is provisional. Merge, split and rename these into real features,');
      console.log('  fixing each `code:` list, then write what a read of the files would NOT tell you.');
    }
    if (stamps.updated.length) console.log(`✓ stamped ${plural(stamps.updated.length, 'feature')}`);
    for (const s of stamps.skipped) console.log(`! ${s}`);
  }

  // Built AFTER the writes, so what is reported is the state the user is left in — not the one
  // they arrived with.
  const report = buildSyncReport(repo, { skipCode: brief });
  report.restored = restored;

  if (json) {
    console.log(JSON.stringify(report, null, 2));
    return strict && failures(repo, report).length ? 1 : 0;
  }

  if (brief) {
    // The session hook's view: short, and only what can be acted on after reading.
    for (const i of report.items.slice(0, 8)) console.log(`- ${i.title}${i.next ? ` → ${i.next}` : ''}`);
    if (report.items.length > 8) console.log(`- … +${report.items.length - 8} more (dspec sync)`);
    return 0;
  }

  if (!report.items.length && !report.coverage.unclaimed) {
    console.log('✓ the model and the code agree');
    return 0;
  }

  for (const i of report.items) {
    console.log(`- ${i.title}`);
    if (i.detail) console.log(`    ${i.detail}`);
    if (i.next) console.log(`    → ${i.next}`);
  }
  for (const f of report.findings.filter((x) => SEVERITY[x.code] !== 'info')) {
    console.log(`${MARK[f.severity]} ${lintLine(f)}`);
  }
  reportCoverage(report.coverage);
  if (!write) console.log('\n(dry run — add `--write` to restore, stamp and render)');

  if (strict) {
    const failed = failures(repo, report);
    if (failed.length) {
      console.log(`\n✗ ${plural(failed.length, 'failure')} — the model and the code disagree about something measurable`);
      return 1;
    }
  }
  return 0;
}
