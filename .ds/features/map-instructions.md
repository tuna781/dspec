---
name: Map instructions
area: The map
kind: product
checked: 2026-09-23
code:
  - templates/memory.md
---

The block dspec writes into `CLAUDE.md` / `AGENTS.md`: what `.ds/` is, how to read it, and whose
job it is to keep it true. It is the only thing that makes the map get used, because it is the only
dspec text an agent reads without being asked.

**What it instructs is the file.** Read `templates/memory.md` — it is forty lines, hinged on three
headings a reader can search for: *"Use it first, for any question about this code."*, *"Do not"*
and *"Keeping it true."* The rules below are the constraints on changing it, which a read of it
would not give.

## Rules

- **This is the product's whole mechanism.** Every agent reads its memory file at the start of
  every session, unprompted. Nothing else dspec writes is read unless somebody types a command.
- **It must stay short.** It is loaded into every session, so every line is paid for on every turn.
  A paragraph that does not change what the agent does next is a paragraph that should go.
- **It teaches reading, not a process.** It says which file to open first and which to open next.
  It asks for nothing else.
- **Everything it asks for is asked for here and nowhere else.** The map describes this block; it
  does not carry a second copy of its instructions — see `product.md`.

## Behaviour

- It states outright that *"If `.ds/` and the code disagree, **the code wins**"* — the one
  instruction that has to be in the block rather than left implied, because a map that lies is worse than no map and the agent
  is the only one who will ever notice.
- Three reads, in order: `.ds/index.md` for what exists and where, one or two feature files for the
  thing actually asked about, and `.ds/product.md` only for a rule or a word that applies
  everywhere. `.ds/files.md` is named separately as the other direction — you have a file and need
  the feature.
- It says the index puts the product's features first and the repository's own machinery under its
  own heading, so a session answering a product question knows it can stop reading half way.
- It says a feature file also carries why it is the way it is, and what it is not sure of — the two
  sections a reader would otherwise not know to look for.
- It says *do not* grep or glob to find where something lives, and *do not* read all of `.ds/`.
  Both are the failure this exists to prevent: an agent that searches anyway has paid for the map
  and used none of it.
- On the writing side it asks for the lookup before the edit — find the owner in `files.md`, update
  that feature file after — and for a choice and its rejected option to go under `## Decisions`.
  Keeping the map current is asked for as part of the work, never as a separate ceremony.
- It asks for that same lookup pointed the other way when reviewing: a diff's changed paths through
  `files.md` name the features it touches, and those pages carry the rules it must not have broken.
  It sits next to the edit-time bullet deliberately — the two are one mechanism, and teaching the
  second costs almost nothing once the first is read.
- `/ds-bootstrap` is named as the way out when the map has fallen far behind.
- It tells the agent to talk to the user in features and behaviour, never about these files — with
  the install fallback carved out by name, because that instruction comes last and would otherwise
  silence it.
- It is wrapped in the `ds:begin` / `ds:end` markers and says so, so that anyone reading the file
  knows which part is theirs.

## Decisions

- **No session hooks; this block is the mechanism instead.** It reaches all three agents equally,
  and a hook would have reached one.
- **The install fallback is bought deliberately.** It is dead weight in every session where dspec is
  already installed. It is kept because it is the only way a repository that carries a map can tell
  a reader where the map came from, and it fires only when the map has fallen behind — the moment
  the tool is worth naming.
- **Review was taught as a read, not built as a command.** Going from a diff to the features it
  can invalidate is a lookup `files.md` already answers, so it needed no new surface. A `/ds-review`
  command was rejected because everything dspec ever installed beyond the one command was a
  workflow, and a second spelling is a second thing to keep true in three agents. A `dspec` verb was
  rejected for more: it would be the first to read `.ds/`, which is the line the tool has held since
  0.2.0 — the CLI installs files and judges nothing. What is lost is a run in CI without an agent,
  and that is the trade.

- **`.ds/` itself is unattributed.** The index is read every session, so a credit there would be
  paid for on every turn. The fallback in this block carries it instead.
