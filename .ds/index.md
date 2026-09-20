# dspec — map

Every feature: what it is, where it lives, what it depends on.
Read this first, then the one feature file you need under `.ds/features/`.

## Setup

- **Agent adapters** — The one place in dspec where anything is agent-specific: where each agent's
  command file goes, what frontmatter it reads, and how to recognise an install.
  → `src/agents.ts` · uses: Managed install
- **Agent install** — `dspec init`, the entire terminal surface: install the command and the map
  instructions into every supported agent, and report what changed. It asks nothing.
  → `src/init.ts` · uses: Agent adapters, Managed install
- **Managed install** — Writing dspec's files into somebody else's repository, and being able to
  take every one of them back. Ownership is the `dspec:managed` mark.
  → `src/install.ts`

## The map

- **Map building** — The `/ds-bootstrap` command: how an agent reads a codebase and writes `.ds/`.
  → `templates/bootstrap.md`
- **Map instructions** — The block written into `CLAUDE.md` / `AGENTS.md`: what `.ds/` is, how to
  read it, and whose job it is to keep it true.
  → `templates/memory.md`

## Delivery

- **Command surface** — The `dspec` command itself: one verb, its flags, and locating the running
  package so `templates/` resolves.
  → `bin/ds.js`, `src/cli.ts`, `src/args.ts`, `src/pkgRoot.ts` · uses: Agent install
- **Demo recording** — The README's recording: two real Claude Code sessions asked the same question
  side by side, one with a `.ds/` map and one without, staged outside this repository so the
  no-map half really has no map.
  → `demo/record-split.sh`, `demo/compose-split.sh`, `demo/make-labels.py`, `demo/.rec-env.sh`,
  `demo/half-without.tape`, `demo/half-with.tape`, `demo/shop`

- **Release** — Cuts a release: the version and the changelog heading, the suite, the commit, the
  tag on that commit, then the GitHub Release from those same notes.
  → `scripts/release.js`, `scripts/publish-release.js`
