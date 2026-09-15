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
// ⚠️ **It installs only a GLOBAL install.** A dspec running from a project's `node_modules` or from
// a checkout belongs to that project's package.json; rewriting it from here would put the
// lockfile and the running version out of step. It says what to run instead.
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

  const globalRoot = npm(['root', '-g']);
  const isGlobal = globalRoot.ok && real(packageRoot()).startsWith(real(globalRoot.out) + path.sep);
  if (!isGlobal) {
    console.log(`  This dspec is not a global npm install (it runs from ${packageRoot()}).`);
    console.log(`  Update it where it is installed — for a project: npm i -D ${PACKAGE}@latest`);
    return 0;
  }

  console.log(`  npm install -g ${PACKAGE}@latest`);
  const install = npm(['install', '-g', `${PACKAGE}@latest`], true);
  if (!install.ok) {
    console.error(`\n✗ npm could not install ${PACKAGE}@${latest}. If it was a permissions error, run it yourself:`);
    console.error(`  npm install -g ${PACKAGE}@latest`);
    return 1;
  }

  console.log(`\n✓ dspec ${current} → ${latest}`);
  console.log(`  Now rebuild what dspec installed in each repo: \`dspec init\` there, or ${invoke('update')} inside your agent.`);
  return 0;
}
