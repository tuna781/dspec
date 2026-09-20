---
name: Map building
area: The map
code:
  - templates/bootstrap.md
---

The `/ds-bootstrap` command: the prose that tells an agent how to read a codebase and write `.ds/`.
The same command the first time and every time after — it builds the map when there is none and
reconciles it with the code when there is.

## Rules

- **A feature is something a person would name** — a capability of the product, not a directory, a
  class or a layer. If the feature list mirrors the folder tree, the names are wrong, and the map
  is then just an expensive `ls`.
- **The description says what a read of the code would not.** Why a branch exists, which failure a
  check prevents, what must never change. Restating a signature is not a description.
- **`code` and `uses` are declared from reading, never guessed** from imports, naming or word
  overlap. A guessed file list will one day omit the file that mattered, and present the omission
  as scope.
- **Never rewrite a description without reading the code for it.** A confident description of code
  nobody opened is worse than no description, because the next session will trust it.
- **The user is not asked to make decisions about the map.** It is the agent's to build, and the
  report back is in features and behaviour, never in files.

## Behaviour

- It carries the file format inline — frontmatter `name`, `area`, `code`, `uses`, then a lead
  paragraph and ordinary markdown sections. Nothing parses any of it, so the format is taught where
  it is used rather than enforced by a linter.
- First run: survey the code, decide what the features are, write one file each, write
  `product.md`, then write `index.md` last and from the feature files — so the index cannot
  describe features that were never written.
- Later runs: the code is the truth and the map is what may be wrong. Fix descriptions, claim
  unclaimed code, delete features whose behaviour is gone, rewrite the index.
- It asks for a self-check: every `code:` path exists, every `uses:` name resolves, every source
  file of consequence is claimed by something.
- The index's shape is given as a worked example, because it is what every future session reads
  first and it must stay scannable: one line of summary, one line of location, no more.
