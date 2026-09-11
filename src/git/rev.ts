// ============================================================
// Everything dspec asks of git
//
// One place spawns the process, so "is this a repo" has one answer and a failure has one meaning.
//
// ⚠️ **git is a source of facts, never a requirement.** Every function here answers `null` or
// `false` when git cannot tell us, and every caller degrades rather than dying: a repository that
// is not a git checkout still loads, still renders and still reports. What it must never do is let
// "I cannot see your files" render as "everything is fine".
// ============================================================

import { execFileSync } from 'node:child_process';

/** Run git and return its output, or `null` when it could not answer. Never throws. */
export function gitOut(repo: string, args: string[]): string | null {
  try {
    // stderr is piped away: a non-git directory otherwise prints `fatal: not a git repository`
    // into the middle of a report, and the null return already says the same thing.
    return execFileSync('git', args, {
      cwd: repo,
      encoding: 'utf-8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

export function isGitRepo(repo: string): boolean {
  return gitOut(repo, ['rev-parse', '--git-dir']) !== null;
}

/**
 * Model files changed in the working tree — descriptions edited but not committed.
 *
 * ⚠️ **A model that has never been committed is NOT a pending change.** git reports an untracked
 * file exactly like a modified one, so a fresh scaffold — where every file is untracked — once
 * opened every session by announcing the whole model as outstanding work. Tracked-ness is the
 * test: once one model file is in git, a new untracked one beside it IS a real edit.
 *
 * ⚠️ **`-uall` is load-bearing.** By default git collapses an untracked directory to a single
 * entry, so twenty new feature files report as one change naming a directory that is not a file.
 */
export function changedModelFiles(repo: string, specDir: string): string[] {
  const tracked = gitOut(repo, ['ls-files', '--', specDir]);
  if (!tracked || !tracked.trim()) return [];
  const status = gitOut(repo, ['status', '--porcelain', '-uall', '--', specDir]);
  if (!status) return [];
  return status.split('\n').filter(Boolean).map((l) => l.slice(3)).filter((p) => p.endsWith('.md'));
}
