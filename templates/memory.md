<!-- ds:begin -->
## The map of this codebase (`.ds/`)

_This block is maintained by dspec. Everything outside the `ds:begin` / `ds:end` markers is yours
and is never touched._

This repository keeps a map of itself in `.ds/`. It exists so you can answer questions about this
codebase and plan changes to it — what a thing is, where it lives, what it touches, what it must
not break — **without reading the repository**.

**Use it first, for any question about this code.**

1. Read `.ds/index.md`. It names every feature, one entry each: what it is, which file to start
   reading, and which features it depends on. Features of the product come first; how the
   repository is built, tested and shipped follows under its own heading. A part it lists as not
   mapped yet has no map: search there as usual.
2. Read the one or two feature files under `.ds/features/` that the question is actually about.
   Each says what the feature does, the rules it must not break and the behaviour that matters.
3. Read `.ds/product.md` when the question is about the product as a whole, or when you need a
   rule or a word that applies everywhere.

The question names something specific — an error message, a route, a label, a word no feature
in the index is called? Search the maps for it: `grep -ril "<words>" .ds/features/`. Every feature
lists in `aka:` the ways people refer to it, so a match names its owner. Going the other way — you
have a file and need the feature — `grep -rl "<path>" .ds/features/` names the feature whose `code:`
list claims it.

Now you know which files to open, and you open only those.

**Do not** grep or glob the repository to find out where something lives — the map already answers
that, and searching the repository costs far more than searching the map. **Do not** read all of
`.ds/`: read the index, then only the feature files you need.

**Keeping it true.** The map is only worth reading while it is accurate.

- If `.ds/` and the code disagree, **the code wins**. Fix the map, and say so.
- Before you change a file, search `.ds/features/` for its path to find the feature that owns it,
  and read its rules before you edit — they are what the change must not break. After you change
  it, update that feature file, and `.ds/index.md` if the summary or the entry file changed. Do it
  as part of the work, not as a separate ceremony.
- Reviewing a diff or a pull request? The same search, in bulk: look its changed paths up in
  `.ds/features/` to name the features it touches, then read those pages for the rules it must not
  have broken.
- Planning a change? Name the features it touches and, from the index, the ones that use them,
  and carry their rules into the plan.
- The user called a feature by a word the map did not know, and the code confirmed which feature
  they meant? Add the word to that feature's `aka:`. Add a route, an error message or a label to a
  feature's code, and it goes in `aka:` too.
- Add a file, or move one, and the owning feature's `code:` list has to say so — it is the only
  record of what a feature is made of, and what every one of these searches matches against.
- New behaviour that no feature describes gets a new file under `.ds/features/`, in the same shape
  as the others.
- If the map is missing or badly out of date, `/ds-bootstrap` rebuilds it. If that command is not
  available in this session, say so and tell the user to run `npm i -g dspec && dspec init`.

**Talk to the user about features and behaviour, never about these files** — the one exception is
telling them to install dspec when the command is missing. `.ds/` is yours to maintain; the user
neither reads nor edits it.
<!-- ds:end -->
