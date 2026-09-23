---
name: Map instructions
area: The map
kind: product
checked: 2026-09-23
code:
  - templates/memory.md
---

The block dspec writes into `CLAUDE.md` / `AGENTS.md`: what `.ds/` is, how to read it — to answer a
question, to plan a change, to review one — and whose job it is to keep it true. It is the only
dspec text an agent reads without being asked.

**What it instructs is the file.** Read `templates/memory.md` — about fifty lines, hinged on three
headings a reader can search for: *"Use it first, for any question about this code."*, *"Do not"*
and *"Keeping it true."* The rules below are the constraints on changing it.

## Rules

- **This is the product's whole mechanism.** Every agent reads its memory file at the start of
  every session, unprompted. Nothing else dspec writes is read unless somebody types a command.
- **It must stay short.** It is loaded into every session, so every line is paid for on every turn.
- **It teaches reading, not a process.** It says which file to open first and which to open next.
- **Everything it asks for is asked for here and nowhere else** — see `product.md`.

## Behaviour

- Three reads, in order: `.ds/index.md`, the one or two feature files the question is about —
  *"what the feature does, the rules it must not break and the behaviour that matters"* — and
  `.ds/product.md` only for a rule or a word that applies everywhere. The other direction, file to
  feature, is a `grep -rl` over `.ds/features/`.
- A part the index lists as not mapped yet has no map, so a search there is right — the one
  exception to *do not grep*.
- *"If `.ds/` and the code disagree, **the code wins**"*: fix the map, and say so.
- Before an edit: find the owning feature and read its rules. After: update that feature file, and
  the index if the summary or entry file changed. Moving or adding a file updates `code:`. New
  behaviour gets a new feature file.
- Reviewing a diff is the same lookup in bulk; planning is the same lookup forward, through the
  index's `used by`.
- It does not ask for decisions to be read or written, or for an answer to flag uncertainty.
- `/ds-bootstrap` is named as the way out when the map has fallen far behind, with an install
  fallback (`npm i -g dspec && dspec init`) when the command is missing.
- It tells the agent to talk to the user in features and behaviour, never about these files, with
  the install fallback carved out by name.
- It sits between `<!-- ds:begin -->` and `<!-- ds:end -->` and says so.
