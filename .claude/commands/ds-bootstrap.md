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
  index.md              every feature, one entry: what it is, where it starts, what it uses
  product.md            what this product is, the rules that apply to every change, its vocabulary
  files.md              which feature owns each file — the reverse of every `code:` list
  features/<slug>.md    one file per feature
```

A feature file — ordinary markdown, nothing parses it:

```markdown
---
name: Apply discount
area: Checkout
kind: product
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

## Decisions
- Why it is this way: a choice made once, what was rejected and why, what an incident taught.

## Unsettled
- What a reader must not take on trust.
```

`name` is how the feature is addressed, and what other features' `uses:` point at — so it is
unique. `area` groups the index; it is a label, not a boundary. `kind` is `product` or `repo`, and
step 2 says which. `code` is **every** file the feature lives in, repo-relative. `uses` names other
features, never files or packages. The file name under `features/` carries no meaning; use a slug
of the name.

**Send a reader to a name, not only to a path.** Wherever the prose points at code — the lead
paragraph, a behaviour bullet, a decision — name what they can search for: a function, a route, an
error message, a constant. `applyDiscount()` in `src/pricing/discount.ts` lands them on the line
rather than the file, and it survives that file being moved, which a path does not. An anchor is
text you read in that file, never a name you expect to be there — one search has to find it.
`code:` itself stays bare paths; `files.md` is built from it exactly as written.

`Rules` and `Behaviour` are always there. The other two are not, and exist because without them
their content has nowhere to go and ends up misfiled in the first two:

- **`## Decisions`** — why it is the way it is. A choice somebody made once and the option they
  rejected, a constraint that came from outside, what an incident taught. This is the section that
  stops the next session helpfully re-adding what this one deliberately removed, so it is worth
  more than any restatement of the code. Omit the heading when the feature has none.

- **`## Unsettled`** — what a reader must not take on trust. Two kinds, and nothing else: what you
  could **not** settle from the code alone — intent, external configuration, behaviour that only
  appears at runtime — and what you found that contradicts itself or describes something that no
  longer exists. **This is not a backlog, not a plan, not a tracker.** Nothing reads it and nothing
  acts on it; it marks the edge of what the map knows, so that the confident half can be believed.
  Omit the heading when there is nothing.

## If `.ds/` does not exist yet

1. **Survey the code.** Get the shape of the repository — its entry points, its directories, its
   build and test setup, its dependencies. Read enough of the source to know what the product
   actually does, not just how it is laid out.

2. **Decide what the features are.** A feature is **something a person would name** — the kind of
   thing that would appear on a list of what this repository does. It is not a directory, not a
   class, not a layer.

   Every feature is one of two kinds:

   - **`kind: product`** — a capability of the product, something its users experience.
   - **`kind: repo`** — how this repository is built, tested, shipped or documented. A user of the
     product never meets it; an agent changing the code needs it constantly.

   Write both kinds. A map holding only the product half sends the next session back to grepping
   the moment it has to touch CI, packaging or the release. They are kept apart rather than merged
   because a flat list of both buries the product under its own scaffolding.

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

   Put every reason you found into `## Decisions` rather than trailing it off a rule, and every
   doubt into `## Unsettled` rather than writing around it.

4. **Write `.ds/product.md`**: what the product is in a paragraph, then `## Rules` — the
   constraints that outlive any one feature (stack, conventions, things nobody may quietly break)
   — then `## Vocabulary` for the words that mean something specific here.

5. **Write `.ds/index.md`** last, from the feature files. Two sections for the two kinds, areas
   inside them, one entry per feature:

   ```markdown
   # <product> — map

   Every feature: what it is, where it starts, what it depends on.
   Read this first, then the one feature file you need under `.ds/features/`.
   `.ds/files.md` answers the other direction: which feature owns a given file.

   ## The product

   ### Checkout

   - **Apply discount** — one-sentence summary from the feature's lead paragraph
     → `src/pricing/discount.ts` +1 · uses: Cart totals, Promotion catalogue · used by: Checkout

   ## The repository

   ### Build & ship

   - **Published package** — one-sentence summary
     → `package.json` +7
   ```

   A repository with no features of one kind simply has no section for it — an empty heading says
   nothing. The location names the **entry file** — where a reader starts — and `+N` for how many
   more the feature holds. The full list is in `files.md`; repeating it here is what stops an
   index being scannable. `used by:` is the reverse of every `uses:`, worked out as you write this file;
   leave it off when nothing uses the feature.

   The index is what every future session reads first, so it must stay scannable: one line of
   summary, one line of location. No prose beyond that.

6. **Write `.ds/files.md`** from every `code:` list — the same facts, the other way round, because
   "I am about to edit this file" is as common a question as "where does this feature live", and
   the entry file in the index cannot answer it:

   ```markdown
   # <product> — files

   Which feature owns each file. Look here before you edit, to find the feature file to update.

   `src/pricing/discount.ts` → Apply discount
   `src/pricing/rules.ts` → Apply discount
   `src/pricing/totals.ts` → Cart totals
   ```

   Sorted by path, one line each, every path exactly as its `code:` list writes it — globs
   included. Like the index, it is rewritten whole every time, so it cannot drift on its own.

7. **Check your own work.** Every path in every `code:` exists, and every anchor you wrote is found
   by searching that feature's own files. Every name in every `uses:` is a feature that exists, and
   every `used by:` in the index is the reverse of a real `uses:`. Every feature carries a `kind`.
   Every `code:` path appears in `files.md`, and nothing appears there twice. Every source file of
   consequence is claimed by some feature — if something is not, either it belongs to a feature you
   already wrote, or it is a feature you missed.

## If `.ds/` already exists

Bring it back into agreement with the code. **The code is the truth; the map is what may be
wrong.**

1. Read `.ds/index.md` and every feature file.
2. For each feature: do its `code:` files still exist, and does the description still match what
   they do? Fix whatever is wrong — a moved file, a changed rule, behaviour that is gone. Search
   its anchors first — an anchor that no longer appears is the cheapest signal you have that the
   code moved under the description. It does not tell you what is now wrong; it tells you where to
   read.
3. Is there code no feature claims? Add it to the feature it belongs to, or write a new feature
   when it is behaviour a person would name.
4. Is there a feature whose behaviour is no longer in the code at all? Delete its file.
5. Bring an older map up to this shape, if it is not already: give every feature a `kind`; move
   reasons and rejected options out of `## Rules` and `## Behaviour` into `## Decisions`; move
   anything you could not settle, and anything you found that no longer describes what exists, into
   `## Unsettled`.
6. Re-check `product.md` against what the repository now is.
7. Rewrite `.ds/index.md` and `.ds/files.md` from the feature files as they now stand.

Work in batches, and read before you rewrite. **Never rewrite a description you have not read the
code for** — a confident description of code you did not open is worse than no description, because
the next session will trust it.

## Report

Tell the user, in one short paragraph: how many features the product has, what you added, renamed
or rewrote, and anything you could not settle from the code alone — the same things you put under
`## Unsettled`, because those are the ones only they can answer. Name features and behaviour, not
files.

<!-- dspec:managed -->
