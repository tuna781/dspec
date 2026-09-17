---
name: Session hooks
area: Agent surface
code:
  - templates/hooks/_ds.js
  - templates/hooks/session-start.js
  - templates/hooks/post-edit.js
  - templates/hooks/stop.js
entry: retarget
uses: [Reconciliation, Drift detection, Model loading]
stamp: sha256g:67f4894a5b491a35
---

Three hooks that run without being asked: a session opens knowing what the project owes, an edit
surfaces the description bound to the file, and a turn that leaves the model behind the code is
held — once — until the agent has brought it up to date. **This is what makes the model maintain
itself in Claude Code.**

**Claude Code alone gets these**, because no other agent can run a command on a session event. That
is the honest shape of the product now: every agent gets the same three commands, and only one gets
the automatic half. On Codex and Cursor the loop degrades to what somebody remembers to type, and
`AGENTS.md` asks them to run `dspec sync --brief` at the start of a session — an instruction, not a
hook, and reported as the weaker thing it is.

Rules
- **No hook blocks the user or a tool call, and every hook exits 0.** A gate here would teach people
  to click past it.
- **The Stop hook holds the agent, not the user, and exactly once.** When the model owes work —
  a description older than its code, a claimed file gone, an `entry:` lost, a feature with no
  description, an artifact behind, or source changed in the working tree that no feature claims —
  it returns `decision: block` with the list and the upkeep steps, so the agent finishes before it
  hands back. When Claude Code reports `stop_hook_active`, it only leaves a note: a hook that holds
  every continuation loops forever.
- **Old undescribed code does not hold a turn.** Only source added or modified in the working tree
  counts; a repository's existing backlog is `/ds-bootstrap`'s, or every turn would be endless.
- **"Not measured" does not hold a turn** — `sync --write` records it mechanically, in the upkeep
  steps the agent is already following.
- **The edit hook speaks rarely, and that is where its value comes from.** It runs after every edit
  and is silent whenever no description points at the file — which is the overwhelming majority of
  the time. Something that speaks on every edit is something nobody reads.
- **It must be affordable.** The session hook runs under a timeout, so it takes the brief report,
  which does not read the code — and therefore does not include drift. The stop hook is where drift
  is measured.

Behaviour
- The edit hook reads the model **in-process** rather than shelling out. There used to be a verb
  that existed only for it — a command no user could name, answering a question no command surface
  advertised. A three-line lookup against the loader shipping beside the hook is the right price;
  a whole verb, and a subprocess per keystroke, was not.
- Every hook resolves the CLI path at runtime, and the verbs it rewrites in advice are read from
  the CLI itself. A hand-kept copy of that list outlived two rounds of command changes, rewriting
  `ds compile` and `ds map` long after both were deleted.
- On session start: what the project owes right now, plus where to look for more.
- After an edit: the features bound to that file, and the instruction to update a description the
  change alters before the turn ends.
- On stop: see the rules above. The reason names the commands through the same retargeting as every
  other hook, so an install reached through `.ds/config.json` is told the command that works.
- The hooks are installed into `.claude/hooks/dspec/`, a directory dspec owns and rebuilds on every
  `dspec init`, and wired by dspec's own entries in the project's
  `settings.json`, referenced through `$CLAUDE_PROJECT_DIR` — the same file is committed and read
  on every teammate's machine, and an absolute path would be right on exactly one of them.
- The CLI is resolved at runtime rather than bundled: `dspec` is on PATH from a global npm install,
  with the absolute path in `.ds/config.json` as the fallback for a shell that cannot see it.
