---
name: Artifact rendering
area: Artifacts
code: [src/compile/renderers.ts, src/compile/artifacts.ts]
entry: renderAll
uses: [Model loading, Agent adapters]
tests: [test/render/renderers.test.js, test/render/artifacts.test.js]
stamp: sha256g:6798869427eae1a8
---

Turns the model into the files an agent actually reads — `.ds/index.md`, the entry point, and one
memory file pointing at it: `CLAUDE.md` for Claude Code, `AGENTS.md` for Codex and Cursor — and
answers whether any of them has fallen behind. The output *is* the product: a surplus line is
tokens every user pays on every agent call, which is why every renderer's output is locked byte for
byte by a snapshot.

Rules
- **A renderer is a pure function, and its output is deterministic.** There is no generation
  timestamp: one on line 1 dirtied the tree on every write, made the session brief report dspec's
  own output as uncommitted work, and guaranteed a conflict between any two branches that synced.
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
- **A memory file somebody else wrote is never replaced.** Most repositories have a `CLAUDE.md` or
  `AGENTS.md` before they have dspec. Into those only a managed block is written, between
  `<!-- ds:begin -->` and `<!-- ds:end -->`, and every byte outside the markers is kept — rendering
  the whole file over one once wiped a team's memory file on its first sync.
- **An index with no stamp is left alone.** Inside `.ds/` it is reported, never overwritten by the
  check.

Behaviour
- A stamp naming a different project is reported as foreign — that catches a file copied in from
  another repository. The name is quoted, so a product called "Acme Shop" is not read back as
  "Acme"; an older unquoted stamp matches on its first word, so those repositories recover on their
  next write instead of being told their own files were copied in.
- A hand-written memory file with no block is reported as missing one; with a block, only the block
  is compared.
- The stamp carries no bundle id: a value that needs an extra write round-trip to obtain, and that
  nothing reads, is not worth having.
