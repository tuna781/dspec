---
name: Agent install
area: Setup
code:
  - src/cli/commands/init.ts
  - src/install/prompt.ts
  - src/install/tracker.ts
entry: cmdInit
uses: [Agent adapters, Model loading]
tests: [test/ship/install.test.js]
stamp: sha256g:fcf6ee324dd0f4b4
---

`dspec init` — installs dspec into the agents a repository uses, and **rebuilds that install on every
run**. The terminal has two jobs: take a newer dspec (`dspec update`) and put it into the agents
(`dspec init`); everything else happens inside a session through `/ds`, `/ds-bootstrap` and `/ds-update`.

It asks which agents to set up, deletes everything dspec installed for them before, writes each
one's files again in its own syntax, and reports what was added, rebuilt and removed.

Rules
- **Every run is a rebuild, never an accumulation.** After an upgrade, one `dspec init` leaves exactly
  what the new version ships: no out-of-date copy, no command a newer version dropped. Editing a
  file dspec installed is therefore pointless, and the README says so.
- **Plan everything before deleting anything.** Every chosen agent's files are rendered first; a
  template that cannot be read stops the run before any install is removed.
- **Never guess a first install when there is nobody to ask.** A non-TTY run with no `--agent`
  rebuilds the agents already installed here — which is what `/ds-update` runs — and refuses
  when there are none. Writing into somebody's `.claude/` because a CI script ran a bare
  `dspec init` is the surprise this tool exists not to spring.
- **An agent that lives outside the repository is never uninstalled from one.** Codex prompts sit in
  the home directory and serve every repository on the machine; not choosing Codex here is not a
  request to remove it everywhere. A repo-scoped agent that was installed and is not chosen again
  is removed.
- **A typo names itself and installs nothing.** An unknown agent is an error before any file is
  written, never a silent omission that leaves half a surface behind.
- **It installs the surface; it does not invent a model.** `dspec sync --write` creates `.ds/`, the
  first time it runs. Keeping the two apart is what stops "set the tooling up" from carrying the
  power to write feature files.
- **The picker takes typed numbers, not arrow keys.** Raw mode on a terminal that does not support
  it leaves the user's shell without an echo after the process exits; `1,3` works over ssh, in
  tmux, and in every editor's embedded shell.

Behaviour
- Agents dspec is already installed for are preselected, so after an upgrade Enter rebuilds the
  same set. With none installed, agents already visible in the repo or the home directory are
  preselected — a guess about what somebody uses, never a claim that dspec is installed for it.
- The absolute path of the running CLI is recorded in `.ds/config.json`, so the Claude hooks still
  resolve when `dspec` is not on PATH — a switched nvm version, a shell that never sourced the
  profile. It is rewritten on every run, because the path and the version are exactly what an
  upgrade changes. It is machine-specific, so add `.ds/config.json` to your own `.gitignore`.
- A repository with no model closes with the next step named — open the agent and type
  `/ds-bootstrap` — rather than leaving somebody with commands and nothing to run them against.
- `.ds/config.json` alone is not a model: a freshly initialised repository still gets features
  proposed by its first `dspec sync --write`.
