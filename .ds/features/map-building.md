---
name: Map building
area: The map
kind: product
checked: 2026-09-25
code:
  - templates/bootstrap.md
aka: ["Not mapped yet"]
---

The `/ds-bootstrap` command: the prose that tells an agent how to read a codebase and write `.ds/`.
The same command the first time and every time after — it builds the map when there is none and
reconciles it with the code when there is.

**The rules it gives are the file, not this page.** Read `templates/bootstrap.md`; it is one pass
and it is written to be read by an agent, in five parts a reader can search for: *"What you are
writing"*, *"If `.ds/` does not exist yet"*, *"If `.ds/` already exists"*, *"A large repository"*
and *"Report"*. What is below is what a read of it will not tell you.

## Rules

- **It carries the whole format inline, and nothing outside it enforces any of it.** No parser, no
  linter, no schema — the format is taught where it is used.
- **This page does not restate it** — see `product.md` on instructions living in `templates/` once.
- **It must read in one pass.** It is loaded whole every time somebody runs `/ds-bootstrap`.
- **It is written for three agents at once.** Nothing in it may assume a tool, a permission or a
  frontmatter key that only one of them has — the adapters prepend the differences.
- **A change here is not landed until `dspec init` has been re-run**: the installed command files
  are copies, and this repository commits them.

## Behaviour

- Both branches in one command: `.ds/` absent, it is built; `.ds/` present, it is reconciled and an
  older map is brought up to the current shape. The user types the same thing either way.
- A feature file is frontmatter (`name`, `area`, `kind`, `checked`, `code`, `uses`, `aka`), a lead
  paragraph, `## Rules` and `## Behaviour`. There is no section for reasons or for doubts: *"Every
  sentence is something you read in the code"*, and what the code does not show is left out.
- `aka` holds handles: how somebody asking would refer to the feature — routes, error codes and
  messages, labels, events, tables, config keys — each read verbatim in the feature's own `code:`,
  or a word the user used once the code confirmed it. *"A handle belongs to exactly one feature"*;
  a word the whole product uses goes to the vocabulary instead. The index never carries handles.
- The build branch does not read commit history. Its guard against invention is *"Never describe
  what you did not read."*
- The reconcile branch deletes `## Decisions` and `## Unsettled` from an older map, moving a line
  into Rules or Behaviour only once it is confirmed against the code, and deletes a `files.md` an
  older map left.
- The sentence set as a blockquote in the build branch is *"If your feature list mirrors the folder
  tree, the names are wrong."*
- Confirming a feature moves its `checked:` date even when nothing needed fixing; a page nobody
  opened keeps its date. Nothing reads the date.
- Anchors — a function, a route, an error message a search finds — are the staleness signal: the
  reconcile branch searches them first, and one that no longer appears says where to read. Anchors
  go in the prose, never in `code:`, whose bare paths are what a search for a file's owner matches.
- The index names each feature's entry file and `+N`, never the full list, and is rewritten whole
  from the feature files on every run.
- The self-check at the end is the only verification that exists anywhere in dspec: the agent
  checking paths, anchors, code-sourced handles and handles claimed twice, `uses:`, `used by:`, `kind`, double claims and unclaimed files. Nothing in
  the CLI reads `.ds/`.
- The report is one paragraph in features and behaviour: how many, what was added, renamed,
  rewritten or deleted, and which parts are not mapped yet.
- *"A large repository"*: a run covers the part the user named, read from what they wrote rather
  than from `$ARGUMENTS`; each feature file is written as soon as its code is read; the index stays
  one flat list grouped by area and ends with a `Not mapped yet — search these directly:` line
  until every part is mapped.
