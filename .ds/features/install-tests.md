---
name: Install tests
area: Build & ship
kind: repo
checked: 2026-09-23
code:
  - test/install.test.js
  - test/support/repo.js
  - .github/workflows/ci.yml
uses: [Agent install, Agent adapters, Managed install, Command surface]
---

What proves dspec does what it says: one suite about `dspec init`, run against real throwaway
repositories by a real child process, plus the CI job that also checks the published tarball and
installs into a scratch repository. Since `init` is the whole terminal surface, this is the whole
of dspec's own tested behaviour. Start at `makeRepo` and `runCli` in `test/support/repo.js` — one
builds the throwaway repository, the other spawns the real binary in it.

## Rules

- **`CODEX_HOME` and `HOME` are redirected into the temp directory, always.** The Codex adapter
  writes to the user's home by design, so a suite that did not redirect it would install into —
  and, on the next case, delete from — the real `~/.codex/prompts` of whoever typed `npm test`.
  `runCli` sets both in its `env`, per repository, pointing at `codexHome(cwd)` and a `fake-home`
  beside it; `HOME` is redirected alongside so a bug in that redirection fails loudly instead of
  reaching the real one.
- **The CLI is run as a process, never imported.** `runCli` spawns `bin/ds.js` with a 60-second
  timeout. An exit code is part of what dspec promises, and the only honest way to observe one is
  to spawn the binary.
- **One `makeRepo`, shared.**
- **Test files live one level deep.** `npm test` expands `test/*.test.js`, so a file nested any
  deeper would never run — and the suite would stay green by not testing it.
- **A removed flag must be an error, not a silent pass.** `--all` and `--yes` are asserted to fail
  — *"the removed picker flags are errors, not silently ignored"* — because a flag that is quietly
  ignored is how a script keeps "working" long after it stopped doing what it says.

## Behaviour

- Two halves: **what lands where** — one command per agent, the right frontmatter for each, the
  block in both memory files, and *"re-running init is byte-identical"* — and **what dspec is
  allowed to touch**: *"a hand-written memory file keeps every byte and gains the block"*, *"a file
  named like ours but without the mark is never removed"*, *"a settings.json holding nothing of
  ours is not even reformatted"*. The test names are written as sentences, so the failure line says
  what broke without opening the file.
- A third group — *"upgrading removes the workflow commands and the hook scripts"* and the cases
  around it — seeds a repository as 0.1.x left it — three commands, hook scripts, hook entries,
  a fully generated `CLAUDE.md`, a `.ds/config.json` — and asserts one `init` leaves only this
  version's command, an empty `hooks` key gone rather than left as a shell, and everything else in
  `settings.json` untouched.
- *"init never creates .ds/ — reading the codebase is the agent's job"* is asserted in the suite,
  and `test ! -e .ds` again in CI: installing must never invent a map of somebody's codebase as a
  side effect.
- CI has two jobs: `test` runs the suite across Node 20, 22 and 24, and `install` — *"Install
  surface"* — checks `npm pack --dry-run` lists both templates and then runs *"Install into a
  scratch repository"*.
- The workflow triggers on `master`, and its pack step is written as a block scalar.
- The suite asserts file paths, frontmatter and marks — never the body of a template. A change to
  the prose in `templates/` is expected to leave it green; a failure there means the change leaked
  into what `init` promises.

## Decisions

- **`makeRepo` is shared because the copies drifted.** The suite this replaced grew five
  near-identical ones; a test that fails for a reason its author did not intend is worse than no
  test, because the next person debugs the wrong thing.
- **The pack check lives in CI and has no substitute in the suite.** The checkout always has
  `templates/`, so only the tarball can reveal a `files` list that would ship a dspec reporting an
  incomplete install of itself.
- **The workflow triggers on `master` after a silent outage.** It once said `main`, a branch that
  has never existed here, so the push trigger never fired and CI was green by never running.
- **The pack step is a block scalar for a related reason.** Written inline, the `": "` inside its
  grep pattern is a YAML mapping separator, and the unparsable file produced no job at all — a
  0-second failure that looked like a test result.
