---
name: ds
description: "The spec loop for a repository whose product model lives in `.ds/` — look up what a feature is, where it lives in the code and what it touches; implement inside that scope; then reconcile the model with what was built. Use whenever this repo has a `.ds/` directory, when CLAUDE.md carries a `<!-- ds: … -->` stamp, or when the user mentions specs, the product model, drift, or the code map."
---

# Working against a dspec model

This repository's product model lives in `.ds/`, written in **dspec-lang**, and **the model is the
source of truth** for what the product does, where each feature lives, and what depends on what.
`CLAUDE.md` is a compiled pointer at it — never edit that file by hand; it is overwritten.

Everything is local. There is no server, no token, no network call. The CLI reads `.ds/` and your
actual source files.

⚠️ **dspec is a toolkit; you are the brain.** Every command either measures something readable from
the checkout or writes something mechanical. None of them decides what a feature is, which files
deserve one, or whether a description is still true — those are judgements, and they are yours and
the user's. Where the tool reports and does not act, that is deliberate: act on the report.

## Start here

**`.ds/index.md` is the entry point.** One read gives you every feature, what it is, and which
files it lives in. Read it before you read any source.

```
.ds/product.md      what this product is, and the rules every change must respect
.ds/glossary.md     what the words mean
.ds/index.md        GENERATED — every feature, one line
.ds/features/*.md   one file per feature — the only prose anyone writes
```

The path of a feature file **carries no meaning**: subfolders under `features/` are a convenience
and are ignored. `area:` is the only grouping.

## The loop

**Code first, then reconcile.** The model is written *after* the code exists, so `.ds/` only ever
describes what the product **is** — never what somebody proposed.

1. **`dspec spec "<Feature name>"`** — what the model already knows: the product rules, the feature,
   the features it uses, the files bound to them, and an explicit warning wherever the model is too
   thin to trust. Start here, not by reading source.
2. **Plan and implement**, staying inside the files the pack's Code Map lists.
3. **`dspec sync --write`** — restore what is missing, re-stamp every feature, re-render the
   artifacts, then work through what it could not decide alone.

⚠️ **Only `dspec bootstrap` and `dspec sync` write to `.ds/`,** and nothing exits non-zero unless asked with `dspec sync --strict`.
Writing a description before the code exists leaves the model describing something that is not
there.

## Looking a feature up

Retrieval is a **lookup, not a search**. `dspec spec` resolves a NAME — an exact match, or a feature's
whole name occurring in your request. It never guesses from overlapping words, so:

- **If it says the model does not name this**, it offers a ranked *"Possibly related — decide, do
  not assume"* list and then every feature. Pick the right name and run it again. Do **not**
  conclude the work is new because the first phrasing missed, and do not go hunting through the
  source instead.
- **A suggestion is a guess with no scope attached.** It tells you which words it matched so you
  can judge it. Confirm it is the feature, then re-run by name — never plan against a suggestion,
  and never treat its files as a code map.
- **Under *"What it uses"* each dependency is a CONTRACT**, not the whole feature: what it
  promises and the rules it holds you to, without how it works. Its rules bind you the same as the
  feature's own — the rule a change breaks is often a dependency's.
- `--touch "<Feature>"` pulls one in by name when you already know it belongs, and is also how you
  turn a contract back into the full description when you genuinely need the inside.

## Slash commands

| | |
|---|---|
| `__DS_CMD_BOOTSTRAP__` | **create** the model for a repo that has none, and finish it |
| `__DS_CMD_SYNC__` | **repair** an existing model — add what is missing, patch what is wrong |
| `__DS_CMD_SPEC__` | describe what the user wants in detail, checked against the model |
| `__DS_CMD_PLAN__` | the same, plus the implementation plan, then build it |

`bootstrap` creates and `sync` repairs. Those are different intentions, and running the wrong one
is how a curated model gets buried under proposals or a missing one silently stays missing.

**These four are a convenience, not the interface.** Each one is prose telling you which `dspec`
command to run and what to judge in its output — so everything they do you can also do by running
the CLI directly, and an agent that has read this file needs no slash command at all.

**Taking a newer dspec**: `npm i -g dspec@latest`, then `dspec init` to add any command that is
new and `dspec sync --write` to re-render the artifacts. ⚠️ `dspec init` **never overwrites a
file that already exists**, so an improved version of a command you already have arrives only if
you delete that file first. Say that to the user rather than letting them wonder why nothing
changed.

## Writing a feature file

__DS_LANG_FULL__

## Rules that are not obvious

- **Never write `stamp` by hand.** `dspec sync --write` computes it from the real files. A typed
  fingerprint is a claim nobody can check.
- **Never invent `tests:`.** List only tests you have actually read that exercise this feature.
  Guessing `drift.ts` → `drift.test.js` turns *"nobody proved this"* into *"this is proven"* — the
  dangerous direction, and it fails silently.
- **`code:` is every file the feature lives in, and it is declared, not inferred.** If you cannot
  say which files a feature occupies, you do not yet know what the feature is — ask.
- **Never delete a feature from the model.** A feature whose code you cannot find is reported as
  drift for the user to decide about. Deleting is their call, not yours.
- **A "⚠ Unreliable" block in a pack means ask, not infer.** Those features are unwritten,
  unproven, or older than their code. Filling the gap from the code, from naming, or from
  convention is exactly the guess this whole system exists to prevent.
- **Drift is reported, never auto-fixed.** If a description is older than its code, read both and
  ask the user which one is wrong. Rewriting the description to match the code silently discards a
  decision someone made.
- **Do not add a feature to mirror a folder.** A feature is something a person would name. If the
  feature list ends up mirroring the directory tree, the names are wrong.
- **Most undescribed code should stay undescribed.** A helper module in the model is noise that
  buries the features that matter.

## When the code does something the model never described

Write it into `.ds/features/` as part of the same change, and say so. The model going stale is the
failure this repository is set up to prevent; an implemented feature with no description is exactly
how it starts.
