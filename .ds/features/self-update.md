---
name: Self update
area: Setup
code: [src/cli/commands/update.ts]
entry: cmdUpdate
uses: [CLI command surface, Agent install]
tests: [test/ship/update.test.js]
stamp: sha256g:05ebcaae80e24ba0
---

`dspec update` — compares the running dspec with the version npm calls `latest`, and installs the
newer one globally if there is one. It touches no repository: rebuilding what dspec installed into a
repo's agents is `dspec init`, and `/ds-update` inside a session runs the two in order.

Rules
- **The one command that uses the network, and only because the user ran it.** It asks npm through
  the user's own `npm`, so their registry, proxy and credentials apply and dspec holds none of them.
  Nothing else in dspec ever makes a network call, and nothing checks for updates in the background.
- **It updates a global install only, in the prefix it runs from.** A dspec running from a project's
  `node_modules` or from a checkout belongs to that project's `package.json`; installing over it from
  here would put the lockfile and the running version out of step. It says what to run instead. The
  install passes `--prefix` explicitly, so a switched nvm version cannot send the new version
  somewhere else while the running one stays old.
- **A global install is recognised by the layout npm creates, never by parsing npm's output.**
  `<prefix>/lib/node_modules/dspec` with `<prefix>/bin/dspec` linking into it (on Windows,
  `<prefix>/node_modules/dspec` with `dspec.cmd`). Comparing against `npm root -g` failed because npm
  redacts any path segment that looks like a UUID, so a real global install under such a directory
  was refused as "not global".
- **A failure is said, never worked around.** An npm that cannot be reached or refuses to install —
  usually a permissions error — is reported with the exact command to run, and exits non-zero. It
  never retries with `sudo` or a different prefix.

Behaviour
- Versions compare numerically by `MAJOR.MINOR.PATCH`, so `0.0.10` is newer than `0.0.9`; a
  pre-release suffix is ignored.
- `--check` only reports whether a newer version exists.
- After installing, it names the next step: `dspec init` in each repo, or `/ds-update` inside the
  agent.
