---
name: Agent install
area: Setup
code:
  - src/init.ts
uses: [Agent adapters, Managed install]
---

`dspec init` — the entire terminal surface. It installs the `/ds-bootstrap` command into every
agent dspec supports, writes the map instructions into their memory files, and reports what
changed. Start at `cmdInit` in `src/init.ts`.

## Rules

- **It never reads or creates `.ds/`.** Setting the tooling up and reading somebody's whole
  codebase are different intentions, and one must not silently carry the other's power. The map is
  written by an agent running `/ds-bootstrap`, which is the only thing that can judge what a
  feature is.
- **It asks nothing, and gives the same answer everywhere.** A terminal, a script and a CI job all
  get every supported agent. An interactive picker made the user answer a question they had no way
  to answer well — which agents they, and every teammate, might reach for on this repo — and the
  two mistakes it could make are not the same size: installing an agent nobody opens costs one
  markdown file, while omitting the one they do open costs a session where `/ds-bootstrap` is
  missing and nothing explains why.
- **Everything is planned before anything is deleted.** A template that cannot be read must not
  leave an agent with its old install removed and no new one written.
- **Not choosing an agent that lives outside the repository is not a request to uninstall it.**
  Codex's command sits in the home directory and is shared by every repo on the machine; skipping
  it here must not remove it from all of them. An agent whose files are in the repo is removed.

## Behaviour

- Which agents: every one dspec supports, unless `--agent a,b` names fewer. Nothing is detected and
  nothing is remembered — the answer does not depend on what the repository looks like or on what
  was installed last time.
- A memory file is written once per distinct name, so choosing Codex and Cursor together produces
  one `AGENTS.md`, not two writes of it.
- `.claude/settings.json` is checked on every run purely to take back the session hooks 0.1.x
  added. Nothing is ever added to it, and a file holding none of dspec's entries is not rewritten
  at all — not even reformatted.
- A `settings.json` that does not parse is reported and left alone, and the install still goes
  through: one stray comma must not cost somebody their configuration, nor their install.
- The report names removals individually. A removal is the one outcome somebody might not expect —
  a command an older dspec had and this one does not.
- The closing line points at `/ds-bootstrap` and says to start a new session, because an agent
  already running will not see a command file that appeared underneath it.
