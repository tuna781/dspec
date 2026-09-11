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
stamp: sha256f:7b26a5662c986ddd
---

Three hooks that run without being asked: a session can open knowing what the project owes, an edit
can surface the description bound to the file, and leaving with a stale model earns one reminder.

**Claude Code alone gets these**, because no other agent can run a command on a session event. That
is the honest shape of the product now: every agent gets the same four commands, and only one gets
the automatic half. On Codex and Cursor the loop degrades to what somebody remembers to type, and
`AGENTS.md` asks them to run `dspec sync --brief` at the start of a session — an instruction, not a
hook, and reported as the weaker thing it is.

Rules
- **Every hook only adds context, and always exits 0.** None of them can block a tool call. A gate
  here would teach people to click past it.
- **The stop reminder is a message for a human, not context for an agent**, and it fires once. If it
  becomes annoying the thing to fix is the model, not the hook.
- **The edit hook speaks rarely, and that is where its value comes from.** It runs after every edit
  and is silent whenever no description points at the file — which is the overwhelming majority of
  the time. Something that speaks on every edit is something nobody reads.
- **It must be affordable.** The session hook runs under a timeout, so it takes the fast half of the
  report and keeps drift, which is the most valuable thing a session can open with.

Behaviour
- The edit hook reads the model **in-process** rather than shelling out. There used to be a verb
  that existed only for it — a command no user could name, answering a question no command surface
  advertised. A three-line lookup against the loader shipping beside the hook is the right price;
  a whole verb, and a subprocess per keystroke, was not.
- Every hook resolves the CLI path at runtime, and the verbs it rewrites in advice are read from
  the CLI itself. A hand-kept copy of that list outlived two rounds of command changes, rewriting
  `ds compile` and `ds map` long after both were deleted.
- On session start: what the project owes right now, plus where to look for more.
- After an edit: the descriptions bound to that file, and the instruction to say so if the change
  contradicts one — rather than leaving the model describing behaviour the code no longer has.
- On stop: an offer to reconcile, only when something bound to changed code is stale.
- The hooks are installed into `.claude/hooks/` and wired by a `hooks` key added to the project's
  `settings.json`, referenced through `$CLAUDE_PROJECT_DIR` — the same file is committed and read
  on every teammate's machine, and an absolute path would be right on exactly one of them.
- The CLI is resolved at runtime rather than bundled: `dspec` is on PATH from a global npm install,
  with the absolute path in `.ds/config.json` as the fallback for a shell that cannot see it.
