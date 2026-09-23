---
name: Readme
area: Documentation
kind: repo
code:
  - README.md
uses: [Demo recording, Demo fixture]
---

The argument for installing dspec, in the order somebody reads it — *The problem*, *What dspec
does*, *Why you can believe the answer*, *And it's cheaper, too* — the recording first, the measured
cost last. It is the only place the product is argued at length, and the one surface where a claim
has to be checkable — every rule it quotes is a rule that is actually in `templates/`.

## Rules

- **The four trust claims are quotations, not copy.** "Nothing is claimed from a name", "nothing is
  described unread", "the map checks itself", "the code wins" are what `templates/bootstrap.md`
  and `templates/memory.md` actually instruct — including what the self-check covers, which is
  enumerated here and has to stay the same list. If a template loses one of them, the claim here
  becomes a lie, and this is the file a reader believes before installing anything.
- **The table says what it measures and nothing more.** Time, tokens and cost — one run each,
  on a named 15-file fixture anybody can clone. No accuracy benchmark is invented to fill the
  gap; what stands in for correctness is the line above the table naming which files each session
  chose to open.
- **"What it won't do" is the same list as the card's pills and the security policy.** Three
  agents, zero dependencies, entirely local, touches only what it marked. Three surfaces, one set
  of facts, so none of them can drift alone.
- **It leads with the answer, not the cost.** The saving stays, below the argument.

## Behaviour

- The install is four lines, above the fold: `npm i -g dspec`, `dspec init`, then `/ds-bootstrap`
  in the agent — followed by "That's it. That's the whole tool."
- The `.ds/` tree it shows names `index.md`, `features/*.md`, `product.md` and `files.md`, which is
  what `/ds-bootstrap` writes. It shows the shape, never the frontmatter — the map's format is
  internal and not a reader's to learn.
- The three-read walkthrough goes `index.md` → `features/apply-discount.md` → the source file, so
  it depends on the index still naming where a feature starts.
- Two tables carry the whole surface: terminal versus agent, and per-agent where the command lands
  and which memory file it reads.
- "dspec is not a workflow" gets its own short section, because the thing 0.2.0 removed is what
  readers arriving from 0.1.x expect to find.
- "Feedback wanted" sits immediately before Contributing and puts the product's one bet — prose no
  schema or fingerprint validates, held up by three instructions and one cheap check — to the
  reader as a question, pointing at Discussions. It is deliberately the last argument in the file: somebody who has not been
  convinced by everything above it is not the person being asked.
- Upgrading from 0.1.x is a collapsed `<details>`: it names the four verbs, the two commands and
  the hooks that went, and points at the changelog rather than restating it.

## Decisions

- **Cost moved below the argument.** All three surfaces — this file, the `package.json`
  description and `dspec --help` — used to open with "stop paying your agent to re-read your
  product". Cost is a consequence; the reason a map matters is that a search answers from files
  that merely share a word and can never recover *why* a feature refuses what it refuses.
- **The invitation to disagree lives in the README, not in each message sent to a reviewer.** A
  review asked for by email is argued once and then lost; a section anybody arriving at the
  repository can find gives every such request one destination, and states the premise being
  questioned so the answer is about that rather than about the tool in general.
- **The default-to-all-three decision is argued in the same words the code comments use.** The
  cheap mistake is one unused markdown file, the expensive one is a missing command with nothing to
  explain why.
