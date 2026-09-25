---
name: Social preview card
area: Documentation
kind: repo
checked: 2026-09-25
code:
  - .github/social-preview.html
  - .github/social-preview.png
---

The card that unfurls wherever the repository's link is pasted — Slack, X, Discord, a chat app —
and so the first thing most people see of dspec. It is the repository's og:image and appears
nowhere on the repository page itself. The HTML is the source and the PNG is a screenshot of it,
both committed because GitHub takes an image and nothing renders one for us. It carries one
headline and one illustration of the concept; the README argues the case at length.

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
- The left half is one headline ("Name it. Your agent knows where.") and the README's tagline —
  *your agent knows your codebase like someone who has worked on it for years*. The right half
  illustrates the concept, not a result: four ways of naming one thing — a team word, an error
  code, a route, a question — all resolving to one feature, *Apply discount*, with where it lives,
  what it does and what it touches, ending on "Any name. One feature."
- The committed `social-preview.png` matches the HTML; the card GitHub serves changes only when it
  is uploaded under Settings.
