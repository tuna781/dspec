// ============================================================
// `dspec update` — take the newest dspec from npm
//
// Compares the running version with the one npm calls `latest`, and installs the newer one the same
// way this one was installed — globally. It does not touch any repository: rebuilding what dspec
// installed into a repo's agents is `dspec init` (or `/dspec-update` from inside a session, which
// runs both).
//
// ⚠️ **The one command that talks to the network, and only because it was asked to.** Every other
// command reads the checkout and nothing else. This asks npm — through the user's own `npm`, so
// their registry, proxy and credentials apply and dspec holds none of them.
//
// ⚠️ **It installs only a GLOBAL install, and into the prefix it is running from.** A dspec running
// from a project's `node_modules` or from a checkout belongs to that project's package.json;
// rewriting it from here would put the lockfile and the running version out of step. It says what
// to run instead.
// ============================================================

import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { invoke } from '../../install/agents';
import { packageRoot, packageVersion } from '../../pkgRoot';
import { parseFlags } from '../args';

const PACKAGE = 'dspec';

const USAGE = `dspec update [--check]

  Compare this dspec with the latest version on npm, and install the latest if it is newer.
  Then run \`dspec init\` in each repo (or ${invoke('update')} inside your agent) to rebuild the
  commands, skill and hooks from the new version.

  --check   only say whether a newer version exists; install nothing`;

const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function npm(args: string[], inherit = false): { ok: boolean; out: string; err: string } {
  const r = spawnSync(NPM, args, {
    encoding: 'utf-8',
    stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    timeout: inherit ? 10 * 60_000 : 30_000,
    // `.cmd` files cannot be spawned without a shell on Windows.
    shell: process.platform === 'win32',
  });
  return { ok: r.status === 0 && !r.error, out: (r.stdout ?? '').trim(), err: (r.stderr ?? '').trim() || String(r.error ?? '') };
}

/** `a > b` for `MAJOR.MINOR.PATCH`, ignoring any pre-release suffix. */
export function isNewer(a: string, b: string): boolean {
  const parts = (v: string) => v.replace(/^v/, '').split(/[-+]/)[0].split('.').map((n) => parseInt(n, 10) || 0);
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i++) {
    if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  }
  return false;
}

const real = (p: string): string => {
  try { return fs.realpathSync(p); } catch { return path.resolve(p); }
};

/**
 * The npm global prefix this dspec is installed in, or `null` when it is not a global install.
 *
 * ⚠️ **Read from the layout npm creates, never from npm's own output.** This used to compare the
 * package directory with `npm root -g` — and npm REDACTS any path segment that looks like a UUID,
 * printing `***` in its place, so a prefix under such a directory never matched and a real global
 * install was refused as "not global". The layout needs no parsing:
 *
 *   Unix     <prefix>/lib/node_modules/dspec   with  <prefix>/bin/dspec → into that package
 *   Windows  <prefix>/node_modules/dspec       with  <prefix>/dspec.cmd
 *
 * A project-local install is `<project>/node_modules/dspec` with its link in `node_modules/.bin`,
 * so it never matches.
 */
export function globalPrefixOf(root: string): string | null {
  const pkg = real(root);
  const nodeModules = path.dirname(pkg);
  if (path.basename(pkg) !== PACKAGE || path.basename(nodeModules) !== 'node_modules') return null;
  const parent = path.dirname(nodeModules);
  if (process.platform === 'win32') {
    return fs.existsSync(path.join(parent, `${PACKAGE}.cmd`)) ? parent : null;
  }
  if (path.basename(parent) !== 'lib') return null;
  const prefix = path.dirname(parent);
  const link = path.join(prefix, 'bin', PACKAGE);
  return fs.existsSync(link) && real(link).startsWith(pkg + path.sep) ? prefix : null;
}

export function cmdUpdate(argv: string[]): number {
  const { values } = parseFlags<{ check?: boolean; help?: boolean }>(argv, {
    check: { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
  });
  if (values.help) {
    console.log(USAGE);
    return 0;
  }

  const current = packageVersion() ?? '0.0.0';
  const view = npm(['view', PACKAGE, 'version']);
  if (!view.ok || !/^\d+\.\d+\.\d+/.test(view.out)) {
    console.error(`✗ could not ask npm for the latest ${PACKAGE} — ${view.err.split('\n')[0] || 'no answer'}`);
    console.error('  Check your connection and that `npm` is on your PATH, then run `dspec update` again.');
    return 1;
  }
  const latest = view.out.split('\n').pop()!.trim();

  if (!isNewer(latest, current)) {
    console.log(`✓ dspec ${current} is the latest version`);
    return 0;
  }
  console.log(`· dspec ${latest} is available — this is ${current}`);
  if (values.check) {
    console.log('  Run `dspec update` to install it.');
    return 0;
  }

  const prefix = globalPrefixOf(packageRoot());
  if (!prefix) {
    console.log(`  This dspec is not a global npm install (it runs from ${packageRoot()}).`);
    console.log(`  Update it where it is installed — for a project: npm i -D ${PACKAGE}@latest`);
    return 0;
  }

  // `--prefix` names the install being replaced. Without it npm uses its own configured prefix,
  // which is not always the one this dspec runs from — a switched nvm version, a second Node — and
  // the update would land somewhere else while this one stayed old.
  const args = ['install', '-g', '--prefix', prefix, `${PACKAGE}@latest`];
  console.log(`  npm ${args.join(' ')}`);
  const install = npm(args, true);
  if (!install.ok) {
    console.error(`\n✗ npm could not install ${PACKAGE}@${latest}. If it was a permissions error, run it yourself:`);
    console.error(`  npm ${args.join(' ')}`);
    return 1;
  }

  console.log(`\n✓ dspec ${current} → ${latest}`);
  console.log(`  Now rebuild what dspec installed in each repo: \`dspec init\` there, or ${invoke('update')} inside your agent.`);
  return 0;
}
