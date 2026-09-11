// ============================================================
// Which files count as this product's source
//
// The denominator of coverage, and the candidate set when hunting for an entry symbol that moved.
// It is git's answer, filtered — never a directory walk, because an untracked build output or a
// vendored dependency would otherwise be reported as code nobody described, and a report full of
// things the user never wrote is a report the user stops reading.
// ============================================================

import * as fs from 'node:fs';
import * as path from 'node:path';
import { gitOut } from '../git/rev';

/** Extensions that carry behaviour. Markdown, JSON and config are described by the files that use them. */
const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt|rb|php|cs|swift|scala)$/;

const GENERATED_DIRS = new Set(['dist', 'build', 'out', 'coverage', 'target', '.next', '.nuxt', '.output']);

/**
 * Directories holding tests or their helpers.
 *
 * ⚠️ **A path segment, not a filename pattern.** `TEST_FILE` below catches `foo.test.ts` but not
 * `test/support/repo.js` or `test/fixtures/model.js` — helpers that are unmistakably test material
 * and were being reported as production code nobody had described. Asking a user to write a
 * feature about their own test fixtures is how a coverage report loses its reader.
 */
const TEST_DIRS = new Set(['test', 'tests', '__tests__', 'spec', 'specs', 'e2e', 'fixtures']);

/** `dist`, and also `dist-plugin`: a build output does not stop being one for having a suffix. */
const isGeneratedSegment = (seg: string): boolean =>
  GENERATED_DIRS.has(seg) || seg.startsWith('dist-');

/**
 * Directories an AI coding agent owns, which `dspec init` writes into.
 *
 * ⚠️ **dspec must not report its own output as code the user failed to describe.** `dspec init`
 * installs hook scripts into `.claude/hooks/`, and they are committed so a teammate gets them on
 * clone — which makes them tracked `.js` files, which made the very next `dspec sync` say
 * *"code no feature describes: .claude/hooks 4/4"*. Asking somebody to write a feature about a
 * file the tool just wrote for them is the fastest way to teach them the coverage report is noise.
 *
 * The same holds for any agent's configuration directory, whoever put the files there: it is
 * configuration for the tools around the product, never the product.
 */
const AGENT_DIRS = new Set(['.claude', '.agents', '.cursor', '.codex', '.gemini', '.github', '.vscode', '.idea']);

/**
 * A test file, by the naming conventions common across the languages above:
 * `*.spec.ts` / `*.test.js`, `*_test.go`, `*_spec.rb`, `test_*.py`.
 *
 * Excluded for the same reason as a build directory: a feature's `code:` describes production
 * behaviour and names its tests in `tests:` instead, so counting a spec file as undescribed source
 * would ask the user to write a feature about their own test suite.
 */
const TEST_FILE = /(\.(spec|test)\.[a-z0-9]+$)|(_(test|spec)\.[a-z0-9]+$)|((^|\/)test_[^/]+\.py$)/i;

/** Is this path one the model is expected to account for? Exactly one place decides. */
export function isSourceFile(rel: string): boolean {
  if (!SOURCE_EXT.test(rel)) return false;
  const segments = rel.split('/').slice(0, -1);
  if (segments.some(isGeneratedSegment)) return false;
  if (segments.some((seg) => AGENT_DIRS.has(seg))) return false;
  if (segments.some((seg) => TEST_DIRS.has(seg))) return false;
  return !TEST_FILE.test(rel);
}

/**
 * Every source file git tracks.
 *
 * ⚠️ Returns `[]` rather than throwing when this is not a git checkout. Coverage then reports
 * nothing, which is the honest answer — "I cannot see your files" must not render as "every file
 * is described".
 */
export function trackedSources(repo: string): string[] {
  const out = gitOut(repo, ['ls-files']);
  if (out === null) return [];
  // ⚠️ Tracked is not the same as present. A file deleted but not yet committed is still in the
  // index, and reporting it as source nobody describes asks the user to write a feature about a
  // file they just removed.
  return out
    .split('\n')
    .filter((f) => f && isSourceFile(f) && fs.existsSync(path.join(repo, f)));
}
