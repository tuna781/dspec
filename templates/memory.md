<!-- ds:begin -->
## The map of this codebase (`.ds/`)

_This block is maintained by dspec. Everything outside the `ds:begin` / `ds:end` markers is yours
and is never touched._

This repository keeps a map of itself in `.ds/`. It exists so you can answer questions about this
codebase — what a thing is, where it lives, what it touches — **without reading the repository**.

**Use it first, for any question about this code.**

1. Read `.ds/index.md`. It names every feature of the product, one entry each: what it is, which
   files it lives in, and which features it depends on.
2. Read the one or two feature files under `.ds/features/` that the question is actually about.
   Each says what the feature does, the rules it must not break, and the behaviour that matters.
3. Read `.ds/product.md` when the question is about the product as a whole, or when you need a
   rule or a word that applies everywhere.

Now you know which files to open, and you open only those.

**Do not** grep or glob the repository to find out where something lives — the map already answers
that, and searching costs far more than reading it. **Do not** read all of `.ds/`: read the index,
then only the feature files you need.

**Keeping it true.** The map is only worth reading while it is accurate.

- If `.ds/` and the code disagree, **the code wins**. Fix the map, and say so.
- After you change code, update the feature file whose `code:` list claims what you touched, and
  `.ds/index.md` if the summary or the file list changed. Do it as part of the work, not as a
  separate ceremony.
- New behaviour that no feature describes gets a new file under `.ds/features/`, in the same shape
  as the others.
- If the map is missing or badly out of date, `/ds-bootstrap` rebuilds it. If that command is not
  available in this session, say so and tell the user to run `npm i -g dspec && dspec init`.

**Talk to the user about features and behaviour, never about these files** — the one exception is
telling them to install dspec when the command is missing. `.ds/` is yours to maintain; the user
neither reads nor edits it.
<!-- ds:end -->
