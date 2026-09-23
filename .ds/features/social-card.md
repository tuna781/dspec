---
name: Social preview card
area: Documentation
kind: repo
checked: 2026-09-23
code:
  - .github/social-preview.html
  - .github/social-preview.png
---

The card that unfurls wherever the repository's link is pasted — Slack, X, Discord, a chat app —
and so the first thing most people see of dspec. It is the repository's og:image and appears
nowhere on the repository page itself. The HTML is the source and the PNG is a screenshot of it,
both committed because GitHub takes an image and nothing renders one for us. It is a separate
artifact from the README's recording: that argues the comparison at length, this has one headline
and four words of proof.

## Rules

- **The card describes the version it ships with.** It is the surface least likely to be reread
  and the one seen first, so a stale claim here misrepresents the product to everybody who never
  scrolls.
- **The map's format stays off the card.** The map is internal, so the panel shows the product
  working — the reads an agent makes before it plans — and never a feature file's frontmatter. A
  card is read by people deciding whether to install, and the format is not theirs to learn.
- **The image is derived, never hand-edited.** A wording change is an edit to the HTML and a fresh
  screenshot. Retouching the PNG puts the two out of step with nothing to detect it, which is the
  same failure the card itself is here to stop.
- **It renders from the file alone.** Inline SVG for the mark, system fonts, no stylesheet and no
  asset fetched from anywhere — the card must not need the network dspec refuses to use.
- **Committing the PNG is not shipping it.** GitHub reads the live card from an upload under
  Settings, not from this repository, and there is no filename convention that would change that.
  A change here is landed only once somebody has uploaded the new image too, and whoever
  regenerates it is told so in the file itself.

## Behaviour

- The page is fixed at 2560×1280, twice GitHub's 1280×640, so the card stays sharp on a retina
  screen. Both `html` and `body` carry those dimensions and hide overflow, so a headless window of
  the same size captures the card exactly with no scrollbar and no letterboxing.
- The screenshot command is a comment at the top of the file — *"Screenshot this page at exactly
  2560x1280"*, with the `chromium --headless` invocation under it — next to the rule about what may
  appear on it, so whoever changes the wording is told in the same place how to regenerate the
  image and what is not allowed on it.
- The pill row states what the README's "What it won't do" section states — three agents, zero
  dependencies, entirely local, MIT — so the two cannot disagree.
- The left half is one headline ("Your agent knows why.") and the README's tagline; the right half
  is `demo/eval`'s `mixed-cart` task: asked to plan discounting only the eligible lines, the agent
  reads the index, then *Promotion catalogue*, finds the half-discount was rejected on purpose, and
  "Before undoing it, it asks you."

## Decisions

- **The version rule came from two minor versions of a lie.** The 0.1.x card advertised a Claude
  Code plugin, a `stamp:` fingerprint and specs "measured against" the code for two releases after
  all three were deleted.
- **The headline is "Your agent knows why."** *Ask the model* said nothing dspec does, and *Ask the
  map* told the reader to consult a map the product says they never read. The *why* is the part only
  the map holds, and it is what `demo/eval` measured a difference on.
- **The panel shows a plan, not an answer.** It used to show the question the recording asks, ending
  in *Three reads. No search.* — a cost claim, which the README deliberately puts below the argument,
  and whose answer line gave a rule without its reason. The planning example is the one result the
  evaluation separates the two conditions on, so every line of it is something a real session did.
- **"Before undoing it", not "before it plans".** The sessions did write a plan; what they asked about
  first was removing the decision. The card claims only that.
- **It no longer mirrors the recording.** The gif still shows the question; the card shows the plan.
  Two surfaces showing two uses was preferred to both repeating the one that is cheaper.
