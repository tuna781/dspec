---
name: Managed install
area: Setup
kind: product
code:
  - src/install.ts
---

Writing dspec's own files into somebody else's repository, and being able to take every one of them
back. It answers one question — *did dspec write this?* — and everything else follows from the
answer. Start at `MANAGED_MARK` and `rebuild`.

## Rules

- **Ownership is a MARK, not a name.** `ds-bootstrap` is short enough that a user or another tool
  may already have a file by a similar name. Everything dspec installs carries `dspec:managed`, and
  only what carries it is ever deleted.
- **Every run deletes the whole install and writes it again.** That is what makes an upgrade clean:
  nothing out of date survives, and nothing a newer version dropped is left behind.
- **A memory file is the user's.** Only the block between `<!-- ds:begin -->` and `<!-- ds:end -->`
  may be written; every other byte is passed through untouched.
- **A file that does not parse is not written to at all.** One stray comma in `settings.json` must
  never cost somebody their whole configuration.
- **Recognising a legacy file needs more than the word "dspec".** Legacy detection is deliberately
  conservative: a path is removed only when it exists, carries no mark, and names dspec, `.ds/`,
  one of dspec's own commands, or loads its old hook helper.

## Behaviour

- `rebuild` deletes everything one agent occupies, writes the planned files, and reports added,
  rebuilt and removed as paths the user can recognise. Parent directories are left in place:
  `.claude/commands/` is the user's as much as dspec's.
- `writeMemoryBlock` has four cases: absent, the file is created holding the block; markers
  present, what is between them is replaced; a 0.1.x artifact, the whole file is replaced; anything
  else, the block is appended and every existing byte kept.
- A 0.1.x artifact is recognised by the `<!-- ds: project="…" -->` stamp on its first line. That
  version generated `CLAUDE.md` in its entirety, so none of such a file is the user's — appending a
  block to prose the new dspec no longer maintains would leave two sets of instructions disagreeing.
- `removeHooks` only ever removes. dspec installs no hooks any more, but 0.1.x did — three entries
  pointing at scripts this version deletes, which would fail on every session start if left. A
  matcher group emptied by that removal is dropped; one that was already empty is the user's and
  stays. When nothing of ours was found the file is not rewritten at all, so somebody's four-space
  indentation is not silently reformatted into two.

## Decisions

- **Delete-and-rewrite replaced an add-only rule.** The old rule protected dspec's files from dspec
  itself, at the cost that no improvement ever reached anybody who already had a copy.
- **Legacy detection reads content, not just names.** 0.0.1's `ds-plan` prompt, once the other
  agents had dropped its tool list, never says "dspec" — it only points at `/ds-spec`. It survived
  upgrades as a stale command until the other signals were added.
