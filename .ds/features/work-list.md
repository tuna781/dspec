---
name: Work list
area: Model quality
code: [src/compile/worklist.ts]
entry: buildWorkList
uses: [Drift detection, Spec quality lint, Artifact rendering, Git access]
tests: [test/reconcile/worklist.test.js]
stamp: sha256f:99b42847e621f95f
---

Answers "what does this project still owe?" — and answers it **derived, never stored**.

Rules
- **No file may be added to answer this question.** Everything is already here: git says which
  descriptions changed without being committed, drift says where the code disagrees, lint says which
  are thin, and a content comparison says whether an artifact has fallen behind. A `todo.md` would
  be a second source of truth for something already known — it starts synchronised, then drifts, and
  then people trust it instead of the model.
- **Only the rules meaning "an agent will have to guess here" reach the list.** Dumping every
  quality finding in would drown the three lines worth reading.
- **A model that has never been committed is not a pending change.** git reports an untracked file
  exactly like a modified one, so a fresh install once opened by announcing the entire model as
  outstanding work. Tracked-ness is the test.

Behaviour
- Four kinds of item: uncommitted description files, drift, thin descriptions, stale artifacts.
- Only items that can be acted on carry a next step. An uncommitted description file carries none —
  under a code-first loop that is normally work already done, and pointing anywhere would send the
  reader to redo something finished.
- Artifact staleness is asked through the shared artifact check, so this and the read-only check
  cannot disagree, and every rendered format is covered rather than just the root file.
