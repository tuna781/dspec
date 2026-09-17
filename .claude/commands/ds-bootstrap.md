---
description: Set up the product model for this repository, or bring it fully up to date
allowed-tools: Bash(dspec sync:*), Bash(dspec accept:*), Bash(dspec spec:*), Read, Edit, Write, Grep, Glob
---

Make this project's internal product model complete and true to the code — **without asking the
user to make decisions about it**. The same command the first time and every time after. The user
never reads or edits the model, so report to them in features and behaviour, never in files.

Before writing anything under `.ds/`, run **`dspec sync --guide`** and follow it.

## The first time — no `.ds/` yet

1. **`dspec sync --write`.** It creates the model and proposes one PROVISIONAL feature per directory
   of source — every name a guess, every description empty.
2. **Turn the proposals into features.** A directory is an observed fact; a feature is something a
   person would name — a capability of the product. Read enough code to merge, split and rename
   them, and fix each `code:` list as you go. If the list ends up mirroring the folder tree, the
   names are wrong.
3. **Write every description**, in batches. For each feature, read its files and write what a read
   of them would **not** tell you: what it does for the product, why a branch exists, what must
   never change. List `uses:` from what you saw, and `tests:` only for tests you have read.
4. **Write the product's rules** in `.ds/product.md` — the constraints that outlive any one feature
   (stack, conventions, things nobody may quietly break) — and the words that mean something
   specific here in `.ds/glossary.md`.
5. **`dspec sync --write`**, then **`dspec sync --strict`**. Repeat 3–5 until it is clean.

A feature file declares `name` · `area` · `code` in its frontmatter, and its body is a lead paragraph plus the fixed labels `Rules` · `Behaviour` — nothing else.

## Every time after — `.ds/` already exists

Run `dspec sync` and resolve **everything** it lists:

- **A description older than its code** — whoever changed the code. Read the code and the
  description, rewrite the description so it is true of what the code does now, then
  `dspec accept "<Feature>"`. Never accept a feature you have not read.
- **A claimed file that is gone, or an `entry:` that moved.** Find where it went and fix `code:`.
  If the behaviour itself is gone from the code, remove that feature's file.
- **A feature with no description.** Read its files and write one.
- **Code no feature describes.** Claim it in the feature it belongs to, or add a feature when it is
  behaviour a person would name. A helper that only serves one feature belongs in that feature's
  `code:`, not in a feature of its own.
- **A `tests:` path that is gone.** Point it at the test that replaced it, or remove it.

Then `dspec sync --write`, and finish with `dspec sync --strict` until it exits clean.

## Report

Tell the user, briefly: how many features the product model has, which were added, renamed or
rewritten, and anything you could not settle from the code alone. Never write `stamp` yourself.

<!-- dspec:managed -->
