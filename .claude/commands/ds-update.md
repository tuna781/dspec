---
description: Update dspec to the latest version and rebuild its commands and hooks here
allowed-tools: Bash(dspec update:*), Bash(dspec init:*)
---

Bring dspec up to date and rebuild what it installed into this repository — the same as running
`dspec update` and then `dspec init` in a terminal.

1. **Run `dspec update`.** It compares the installed dspec with the latest on npm and installs the
   newer one if there is one. If it could not reach npm, or npm refused to install (a permissions
   error), show the user the exact command it printed and **stop** — do not work around it with
   `sudo` or a different install location.

2. **Run `dspec init --yes`.** It deletes every command and hook dspec installed for the agents
   already set up here, and dspec's own entries in `.claude/settings.json`, and writes them again
   from the installed version. Nothing else in the repository is touched.

3. **Report what changed**, from the two outputs: the version before and after, and per agent what
   was added, rebuilt and removed. Say that the rebuilt commands take effect in a **new session**,
   and that `/ds-bootstrap` brings the product model up to date with anything the new version
   measures differently.

<!-- dspec:managed -->
