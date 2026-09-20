---
name: Map instructions
area: The map
code:
  - templates/memory.md
---

The block dspec writes into `CLAUDE.md` / `AGENTS.md`: what `.ds/` is, how to read it, and whose
job it is to keep it true. It is the only thing that makes the map get used, because it is the only
dspec text an agent reads without being asked.

## Rules

- **This is the product's whole mechanism.** Every agent reads its memory file at the start of
  every session, unprompted. That is why there are no session hooks: this reaches all three agents
  equally, and a hook would have reached one.
- **It must stay short.** It is loaded into every session, so every line is paid for on every turn.
  A paragraph that does not change what the agent does next is a paragraph that should go. The one
  deliberate exception is the install fallback: it is dead weight in every session where dspec is
  already installed, and it is bought because it is the only way a repository that carries a map
  can tell a reader where the map came from.
- **It teaches reading, not a process.** It says which file to open first and which to open next.
  It asks for nothing else.
- **The code wins.** Stated outright, because a map that lies is worse than no map and the agent is
  the only one who will ever notice.

## Behaviour

- Three reads, in order: `.ds/index.md` for what exists and where, one or two feature files for the
  thing actually asked about, and `.ds/product.md` only for a rule or a word that applies
  everywhere.
- It says *do not* grep or glob to find where something lives, and *do not* read all of `.ds/`.
  Both are the failure this exists to prevent: an agent that searches anyway has paid for the map
  and used none of it.
- Keeping the map current is asked for as part of the work, never as a separate ceremony, and
  `/ds-bootstrap` is named as the way out when it has fallen far behind.
- When the map needs rebuilding and `/ds-bootstrap` does not exist in the session, the agent is told
  to name the install command. This is the only path by which somebody who cloned a repository with
  a map — a teammate, a contributor — learns that dspec exists; `.ds/` itself is unattributed on
  purpose, because the index is read every session and a credit there would be paid for on every
  turn. It fires only when the map has fallen behind, which is the moment the tool is worth naming.
- It tells the agent to talk to the user in features and behaviour, never about these files — with the
  install fallback carved out by name, because that instruction comes last and would otherwise
  silence it.
- It is wrapped in the `ds:begin` / `ds:end` markers and says so, so that anyone reading the file
  knows which part is theirs.
