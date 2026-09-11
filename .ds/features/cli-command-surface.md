---
name: CLI command surface
area: Delivery
code:
  - bin/ds.js
  - src/cli/index.ts
  - src/cli/args.ts
  - src/cli/repo.ts
  - src/pkgRoot.ts
  - src/text.ts
entry: main
tests: [test/contract/cli.test.js, test/contract/suite.test.js]
stamp: sha256f:6956db83dcf43341
---

The `dspec` command itself: argument parsing, subcommand dispatch, locating the repository root,
and the small shared helpers every command leans on.

Rules
- **One flat set, and every verb is a command the user knows by name.** The listing was once split
  into "what you type" and "what the hooks call", which invited verbs that existed only because
  something used to call them — `drift`, `doctor`, `pack`, `whose` and `check` all survived that
  way, each overlapping a neighbour. If a user cannot name it, it is not a command, and its job
  belongs to a flag on one they can. `version` went the same way most recently: the number is what
  people ask for, `--version` answers it, and the health report nobody asked for was burying it.
- **The verb set is exported, so no surface keeps its own copy.** Three hand-kept lists were still
  retargeting `ds compile` and `ds map` two rounds after those commands were deleted; rewriting a
  verb the CLI does not have tells the agent to run something that fails.
- **`dspec` is on PATH, and that is what makes every agent reachable.** Installed globally from
  npm, the same binary answers a hook, a slash command and a person typing in a terminal. The
  Claude Code plugin that preceded this existed only to bundle the CLI beside its own hooks; a
  global install removes that reason, and with it the need for Claude Code to be a special case.
- **`bootstrap` creates and `sync` repairs, and only those two write to the model.** The help text
  states it, and the command surface is where that invariant is visible.
- **Every command works from any subdirectory** — the repository root is the nearest ancestor
  holding the model directory.
- **Nothing exits non-zero unless asked.** `sync --strict` is the CI gate and nothing else turns
  it on: a command that failed by default would make every other use of it a hazard.

Behaviour
- An unknown subcommand prints the usage rather than failing silently, since that text is what an
  agent reads when it mistypes.
