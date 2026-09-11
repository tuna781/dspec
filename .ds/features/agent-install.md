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
stamp: sha256f:69725e3ded0135fa
---

`dspec init` — the one command a human has to type. Everything else dspec does is an ordinary
terminal command an agent can run for itself; this one is the exception only because of the
ordering, since it is what puts the slash commands there in the first place.

It asks which agents to set up, writes each one's files in its own syntax, and reports honestly
what each agent will and will not be able to do.

Rules
- **Add what is absent, never touch what is there, and no flag turns that off.** A `--force` is a
  flag people pass out of habit, and then the rule protects nobody. The cost is real and is stated
  in the output every time: a file that already exists never receives a newer version of itself, so
  taking an improved command means deleting the old one first. A user who upgrades and sees nothing
  change has to be told why, not left to conclude the upgrade failed.
- **Never guess when there is nobody to ask.** A non-TTY run with no `--agent` refuses rather than
  choosing. Writing into somebody's `.claude/` because a CI script ran a bare `dspec init` is the
  surprise this tool exists not to spring.
- **A typo names itself and installs nothing.** An unknown agent is an error before any file is
  written, never a silent omission that leaves half a surface behind.
- **It installs the surface; it does not invent a model.** `bootstrap` creates `.ds/`. Keeping the
  two apart is what stops "set the tooling up" from carrying the power to write feature files.
- **The picker takes typed numbers, not arrow keys.** Raw mode on a terminal that does not support
  it leaves the user's shell without an echo after the process exits; `1,3` works over ssh, in
  tmux, and in every editor's embedded shell.

Behaviour
- Agents already visible in the repo or the home directory are preselected, so Enter is usually the
  right answer — but preselection is a guess about what somebody uses, never a claim that dspec is
  installed for it.
- The absolute path of the running CLI is recorded in `.ds/config.json`, which is gitignored, so
  the Claude hooks still resolve when `dspec` is not on PATH — a switched nvm version, a shell that
  never sourced the profile. A stale entry is harmless: the hook checks the path exists first.
- A repository with no model closes with the next step named — open the agent and type
  `/ds-bootstrap` — rather than leaving somebody with commands and nothing to run them against.
