---
name: Artifact rendering
area: Artifacts
code: [src/compile/renderers.ts, src/compile/artifacts.ts]
entry: renderAll
uses: [Model loading, Agent adapters]
tests: [test/render/renderers.test.js, test/render/artifacts.test.js]
stamp: sha256f:7b1c8450ad98697c
---

Turns the model into the files an agent actually reads — `.ds/index.md`, the entry point, and one
memory file pointing at it: `CLAUDE.md` for Claude Code, `AGENTS.md` for Codex and Cursor — and
answers whether any of them has fallen behind. The output *is* the product: a surplus line is
tokens every user pays on every agent call, which is why every renderer's output is locked byte for
byte by a snapshot.

Rules
- **A renderer is a pure function.** The generation timestamp is a parameter, never read from the
  clock inside — otherwise every snapshot turns red on every run, and the only remaining fix is to
  strip the one line that matters.
- **Freshness is decided by re-rendering and comparing content, not by a version number.** A
  hand-edited file still carries the old number.
- **A memory file is a pointer, not a copy.** Rendered from every element it would grow with the
  model — 88 KB for a hundred elements — and every byte was billed to every agent call. A pointer
  costs a few lines and sends the reader to the one file they need.
- **Only the file with no hook behind it asks the agent to brief itself.** `AGENTS.md` carries a
  paragraph telling Codex and Cursor to run `dspec sync --brief` at the start of a session, because
  neither can run a command on a session event. `CLAUDE.md` does not, because its SessionStart hook
  has already done it — and a paragraph repeating a hook is noise billed on every turn.
- **Which memory files exist is derived from the checkout, never stored.** Two sources, and it
  needs both: the files already on disk, so a repo keeps rendering what it renders, and the agents
  actually installed, so the first sync after choosing Cursor produces the file Cursor will read.
- **Every artifact is checked, not just the root file.** A stale index sends every reader to the
  wrong place while the memory file looks perfectly current.
- **A generated file carries a stamp.** Without it a generated file and a hand-written one are
  indistinguishable, and people edit the very file the next render overwrites — losing their words,
  with nothing to warn them.
- **A file with no stamp is left alone.** Inside a directory the user owns, unstamped is the
  ordinary case, and a note on every run teaches people to skim past the whole report.

Behaviour
- A stamp naming a different project is reported as foreign — that catches a file copied in from
  another repository.
- The stamp carries no bundle id: a value that needs an extra write round-trip to obtain, and that
  nothing reads, is not worth having.
