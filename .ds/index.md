# dspec — map

Every feature: what it is, where it starts, what it depends on.
Read this first, then the one feature file you need under `.ds/features/`.
`.ds/files.md` answers the other direction: which feature owns a given file.

## The product

### Setup

- **Agent adapters** — The one place in dspec where anything is agent-specific: where each agent's
  command file goes, what frontmatter it reads, and how to recognise an install.
  → `src/agents.ts` · uses: Managed install · used by: Agent install, Install tests
- **Agent install** — `dspec init`, the entire terminal surface: install the command and the map
  instructions into every supported agent, and report what changed. It asks nothing.
  → `src/init.ts` · uses: Agent adapters, Managed install · used by: Command surface, Install tests
- **Managed install** — Writing dspec's files into somebody else's repository, and being able to
  take every one of them back. Ownership is the `dspec:managed` mark.
  → `src/install.ts` · used by: Agent adapters, Agent install, Install tests

### The map

- **Map building** — The `/ds-bootstrap` command: how an agent reads a codebase and writes `.ds/`.
  → `templates/bootstrap.md`
- **Map instructions** — The block written into `CLAUDE.md` / `AGENTS.md`: what `.ds/` is, how to
  read it, and whose job it is to keep it true.
  → `templates/memory.md`

### Command line

- **Command surface** — The `dspec` command itself: one verb, its flags, and locating the running
  package so `templates/` resolves.
  → `src/cli.ts` +3 · uses: Agent install · used by: Install tests

## The repository

### Build & ship

- **Published package** — What a user receives from `npm i -g dspec`: the TypeScript build, the two
  bin names, and the `files` list that decides what ships.
  → `package.json` +10
- **Release** — Cuts a release: the version and the changelog heading, the suite, the commit, the
  tag on that commit, then the GitHub Release from those same notes.
  → `scripts/release.js` +2
- **Install tests** — What proves `dspec init` does what it says: one suite against real throwaway
  repositories, plus the CI job that checks the tarball and installs into a scratch repo.
  → `test/support/repo.js` +2 · uses: Agent install, Agent adapters, Managed install, Command surface

### Documentation

- **Readme** — The argument for installing dspec, in reading order — and the only place the product
  is argued at length, so every rule it quotes has to be one `templates/` really states.
  → `README.md` · uses: Demo recording, Demo fixture
- **Contributing** — How a change or a report gets in: one contract file, the issue and pull-request
  forms, and a private channel for anything that is a vulnerability.
  → `CONTRIBUTING.md` +7
- **Social preview card** — The card that unfurls wherever the repository's link is pasted: an
  HTML source, and the screenshot of it somebody uploads to GitHub by hand.
  → `.github/social-preview.html` +1

### Demo

- **Demo recording** — The README's recording: two real Claude Code sessions asked the same question
  side by side, one with a `.ds/` map and one without, staged outside this repository so the
  no-map half really has no map.
  → `demo/README.md` +8 · uses: Demo fixture · used by: Readme
- **Demo fixture** — `demo/shop`, a fifteen-file storefront that exists to be asked a question, with
  a real map committed: the repository the recording and the README's figures are made in.
  → `demo/shop/.ds/index.md` +25 · used by: Readme, Demo recording
