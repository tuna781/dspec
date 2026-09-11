// One sentence per rule, and one place that owns it. The linter reports codes; a code with no
// sentence is a code the user has to look up, and nobody looks it up.
import type { Finding } from '../compile/lint';

export function lintLine(f: Finding): string {
  const where = f.feature ?? f.subject ?? '';
  return `${where ? `${where}: ` : ''}${f.detail}`;
}

/** `error` · `warn` · `info` as a fixed-width marker, so a list of findings reads as a column. */
export const MARK: Record<Finding['severity'], string> = { error: '✗', warn: '!', info: '·' };
