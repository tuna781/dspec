---
name: Map building
area: The map
kind: product
checked: 2026-09-23
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
- Confirming a feature now produces something. Reading its code and finding nothing to fix still
  moves its `checked:` date, which is the only way the map distinguishes *looked at and still
  true* from *never looked at* — two states a description alone reads identically in.
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
  splitting a feature name across a line break. The full inventory stayed in each feature's own
  `code:`; the index is read every session and is the one file that has to stay scannable.
- **`index.md` is rewritten whole, never patched.** It is derived entirely from the feature files,
  so regenerating it is what stops it drifting on its own.
- **An anchor is the whole of dspec's staleness signal, and hashing was rejected for it.** A feature
  now points at a name a search can find — a function, a route, an error message — and the
  reconcile branch searches those before it reads anything. An anchor that no longer appears says
  the code moved under the description, and it says it without a manifest, a state file or a CLI
  that reads `.ds/`. Content hashing over the tree was the alternative and is what 0.2.0 removed:
  it needs somewhere to keep the hashes, it fires on a whitespace commit, and it stays silent when
  a rename inverts what a rule means. Anchors go in the prose, never in `code:` — those paths are
  what a search for a file's owner matches, so nothing may decorate them.

- **`files.md` was deleted, and the search replaced it.** It restated every `code:` path a second
  time — seventy-four lines of this repository's own map that said nothing the feature files did
  not already say — and it had to be rewritten whole whenever a file moved. `product.md` already
  says a fact in two places is a fact that will be edited in one, and the map was breaking its own
  rule. `grep -rl` over `.ds/features/` answers the same question exactly, cannot fall behind, and
  costs nothing to maintain. What is lost is one read where there is now one search, and a reader
  with no tools; the reconcile branch deletes a `files.md` an older map left, because a copy nobody
  rewrites is a copy that lies. The one place the search is weaker than the index it replaced: a
  path that is a suffix of another — `src/a.ts` against `vendor/src/a.ts` — matches both. It is
  visible when it happens, two features instead of one, and `grep -rn "^  - <path>$"` settles it.

- **A date was added where a checker was refused.** `checked:` records the day somebody last read
  a feature's code and stood behind the page. Nothing reads it, nothing enforces it and nothing
  goes red as it ages — which is exactly what separates it from the fingerprints 0.2.0 removed. It
  was weighed against the rule that keeping the map current is part of the work and never a
  ceremony, and it survives that because it is one line written by the pass that was already
  rewriting the file. What makes it worth anything is the prohibition beside it: a date is never
  moved forward for a page nobody opened, so an old date stays honest instead of becoming a claim.
  It is kept out of the index for the same reason the full file list is.

- **`kind` replaced the rule that a feature is only a product capability.** Eight of this
  repository's own fourteen features are its packaging, tests, docs and release — real knowledge an
  agent needs, which the old rule forbade and the map wrote anyway. Separating the two kinds keeps
  them without burying the product under its own scaffolding.
