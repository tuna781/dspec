---
name: Map building
area: The map
kind: product
code:
  - templates/bootstrap.md
---

The `/ds-bootstrap` command: the prose that tells an agent how to read a codebase and write `.ds/`.
The same command the first time and every time after — it builds the map when there is none and
reconciles it with the code when there is.

**The rules it gives are the file, not this page.** Read `templates/bootstrap.md`; it is one pass
and it is written to be read by an agent, in four parts a reader can search for: *"What you are
writing"*, *"If `.ds/` does not exist yet"*, *"If `.ds/` already exists"* and *"Report"*. What is
below is what a read of it will not tell you.

## Rules

- **It carries the whole format inline, and nothing outside it enforces any of it.** No parser, no
  linter, no schema — the format is taught where it is used. A rule that is not in this file is a
  rule nobody follows.
- **This page does not restate it.** Six rules here were transcriptions of the template, kept in
  step by hand; see `product.md` for why instructions live in `templates/` once.
- **It must read in one pass.** It is loaded whole every time somebody runs `/ds-bootstrap`, and an
  agent that skims it writes a map by half the rules. Length is bought, never assumed.
- **It is written for three agents at once.** Nothing in it may assume a tool, a permission or a
  frontmatter key that only one of them has — the adapters prepend the differences.
- **A change here is not landed until `dspec init` has been re-run**, because the installed command
  files are copies and the repository commits them.

## Behaviour

- Both branches in one command: `.ds/` absent, it is built; `.ds/` present, it is reconciled and an
  older map is brought up to the current shape. The user types the same thing either way.
- The sentence that does the most work in the build branch is *"If your feature list mirrors the
  folder tree, the names are wrong."* It is the only instruction set as a blockquote, because it is
  the failure every other rule about naming is downstream of.
- The self-check at the end is the only verification that exists anywhere in dspec. It is the
  agent checking its own work in prose — nothing in the CLI reads `.ds/` to confirm it.
- The report it asks for is the one place the map surfaces to the user, and it is deliberately in
  features and behaviour: what was added or rewritten, and what could not be settled from the code.

## Decisions

- **The six rules this file used to restate were deleted, not moved.** They were already in
  `templates/bootstrap.md`, which is what ships and what an agent actually reads; a second copy in
  the map could only ever fall behind it. What is left here is what a read of the template does not
  give.
- **The index names the entry file, not the whole list.** It once carried every path, and at
  fourteen features four entries had already outgrown the one line the format asks for, one of them
  splitting a feature name across a line break. The full inventory moved to `files.md`; the index
  is read every session and is the one file that has to stay scannable.
- **`index.md` and `files.md` are rewritten whole, never patched.** Both are derived entirely from
  the feature files, so regenerating them is what stops them drifting on their own.
- **An anchor is the whole of dspec's staleness signal, and hashing was rejected for it.** A feature
  now points at a name a search can find — a function, a route, an error message — and the
  reconcile branch searches those before it reads anything. An anchor that no longer appears says
  the code moved under the description, and it says it without a manifest, a state file or a CLI
  that reads `.ds/`. Content hashing over the tree was the alternative and is what 0.2.0 removed:
  it needs somewhere to keep the hashes, it fires on a whitespace commit, and it stays silent when
  a rename inverts what a rule means. Anchors go in the prose, never in `code:` — `files.md` is
  built from those paths exactly as written.

- **`kind` replaced the rule that a feature is only a product capability.** Eight of this
  repository's own fourteen features are its packaging, tests, docs and release — real knowledge an
  agent needs, which the old rule forbade and the map wrote anyway. Separating the two kinds keeps
  them without burying the product under its own scaffolding.
