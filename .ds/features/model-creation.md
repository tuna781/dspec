---
name: Model creation
area: Setup
code: [src/cli/commands/scaffold.ts]
entry: proposeFeatures
uses: [Source inventory, Body vocabulary]
tests: [test/reconcile/sync.test.js]
stamp: sha256g:be1b4ab992fb9554
---

Proposes the first features for a repository that has none: one provisional feature per directory
of source, with its file list filled in. `dspec sync --write` calls this the first time it finds no
`.ds/` — creating the model and proposing its first features are the same act, not two commands
that happen to run back to back.

It only ever proposes; deciding what a feature is, and writing `.ds/` itself, belongs to
Reconciliation.

Rules
- **It proposes; it never concludes.** A directory is an observed fact; a feature is a judgement
  about what the product does. Every scaffolded file says PROVISIONAL in its own frontmatter.
- **The empty body is the point, not an omission.** An empty body reports as `no_body`, which is a
  worklist the user can work through. A body pre-filled with a transcription of the code reports as
  complete — a lie, and it buries the very list that would have said what still needs writing.
  Drafting bodies from leading comments once produced 130 "complete" descriptions that restated
  their own function signatures.
- **Guidance lives in frontmatter comments, never in the body.** A body is rendered into the index
  and read on every call; a note there is billed forever, and it would silence the rule that makes
  this scaffold a worklist. The parser strips these comments and the first stamp removes them —
  which is the right lifetime.
- **Existing files are never overwritten**, and a name collision is resolved by qualifying with the
  path rather than replacing: two features silently sharing a file is the shape that once wrote one
  feature's fingerprint into another's.

Behaviour
- Proposals are written only into an **empty** model. Once a person has written even one feature,
  undescribed files are reported instead — auto-creating a file per directory on every run would
  bury a curated model under provisional noise.
