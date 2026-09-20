---
description: Map this codebase into .ds/ so any agent can answer questions about it without reading the whole repo
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

Map this codebase into `.ds/`, so that any future session can answer questions about it by reading
the map instead of re-reading the repository.

Run the same way the first time and every time after. Do not ask the user to make decisions about
the map — it is yours to build and maintain. **Report to them in features and behaviour, never in
files:** they neither read nor edit `.ds/`.

## What you are writing

```
.ds/
  index.md              every feature, one entry: what it is, where it lives, what it uses
  product.md            what this product is, the rules that apply to every change, its vocabulary
  features/<slug>.md    one file per feature
```

A feature file — ordinary markdown, nothing parses it:

```markdown
---
name: Apply discount
area: Checkout
code:
  - src/pricing/discount.ts
  - src/pricing/rules.ts
uses: [Cart totals, Promotion catalogue]
---

What this feature is, in product terms, and where to start reading. One paragraph.

## Rules
- Invariants a change must not break, and why.

## Behaviour
- What it does, and the cases that matter: order, precedence, what it refuses.
```

`name` is how the feature is addressed, and what other features' `uses:` point at — so it is
unique. `area` groups the index; it is a label, not a boundary. `code` is **every** file the
feature lives in, repo-relative. `uses` names other features, never files or packages. The file
name under `features/` carries no meaning; use a slug of the name.

## If `.ds/` does not exist yet

1. **Survey the code.** Get the shape of the repository — its entry points, its directories, its
   build and test setup, its dependencies. Read enough of the source to know what the product
   actually does, not just how it is laid out.

2. **Decide what the features are.** A feature is **something a person would name** — a capability
   of the product, the kind of thing that would appear on a list of what it does. It is not a
   directory, not a class, not a layer.

   > **If your feature list mirrors the folder tree, the names are wrong.** Merge, split and
   > rename until each one is a capability. A helper that only serves one feature belongs in that
   > feature's `code:`, not in a feature of its own.

   Aim for a list somebody could read in a minute. A large repository has tens of features, not
   hundreds.

3. **Write one file per feature.** Read its files first — all of them. Then write what a read of
   those files would **not** tell you: what it does for the product, why a branch exists, which
   failure a check prevents, what must never change. Restating a function signature is not a
   description; if one read of the code would tell you, it is not worth a line.

   Fill `code:` with every file, and `uses:` with what you actually saw it depend on. Both are
   **declared from reading, never guessed** from imports, naming or word overlap.

4. **Write `.ds/product.md`**: what the product is in a paragraph, then `## Rules` — the
   constraints that outlive any one feature (stack, conventions, things nobody may quietly break)
   — then `## Vocabulary` for the words that mean something specific here.

5. **Write `.ds/index.md`** last, from the feature files. One entry per feature, grouped by area:

   ```markdown
   # <product> — map

   Every feature: what it is, where it lives, what it depends on.

   ## Checkout

   - **Apply discount** — one-sentence summary from the feature's lead paragraph
     → `src/pricing/discount.ts`, `src/pricing/rules.ts` · uses: Cart totals, Promotion catalogue
   ```

   The index is what every future session reads first, so it must be scannable: one line of
   summary, one line of location. No prose beyond that.

6. **Check your own work.** Every path in every `code:` exists. Every name in every `uses:` is a
   feature that exists. Every source file of consequence is claimed by some feature — if something
   is not, either it belongs to a feature you already wrote, or it is a feature you missed.

## If `.ds/` already exists

Bring it back into agreement with the code. **The code is the truth; the map is what may be
wrong.**

1. Read `.ds/index.md` and every feature file.
2. For each feature: do its `code:` files still exist, and does the description still match what
   they do? Fix whatever is wrong — a moved file, a changed rule, behaviour that is gone.
3. Is there code no feature claims? Add it to the feature it belongs to, or write a new feature
   when it is behaviour a person would name.
4. Is there a feature whose behaviour is no longer in the code at all? Delete its file.
5. Re-check `product.md` against what the repository now is.
6. Rewrite `.ds/index.md` from the feature files as they now stand.

Work in batches, and read before you rewrite. **Never rewrite a description you have not read the
code for** — a confident description of code you did not open is worse than no description, because
the next session will trust it.

## Report

Tell the user, in one short paragraph: how many features the product has, what you added, renamed
or rewrote, and anything you could not settle from the code alone. Name features and behaviour, not
files.

<!-- dspec:managed -->
