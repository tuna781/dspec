// Find the repo root: the nearest ancestor holding `.ds/`, else `.git/`, else the cwd —
// which is what lets `ds compile` run from any subdirectory, exactly as `git` does, rather
// than making the user remember where they are standing.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { SPEC_DIR } from '../model/load';

export function findRepo(from: string = process.cwd()): string {
  let dir = path.resolve(from);
  let gitRoot: string | null = null;
  for (;;) {
    if (fs.existsSync(path.join(dir, SPEC_DIR))) return dir;
    if (!gitRoot && fs.existsSync(path.join(dir, '.git'))) gitRoot = dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return gitRoot ?? path.resolve(from);
}
