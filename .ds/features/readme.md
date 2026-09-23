---
name: Readme
area: Documentation
kind: repo
checked: 2026-09-23
code:
  - README.md
uses: [Demo recording, Demo fixture, Demo evaluation]
---

The argument for installing dspec, in the order somebody reads it — *The problem*, *What dspec
does*, *What your agent does with it*, *Why you can believe the answer*, *And it's cheaper, too* —
the recording first, the measured cost last. It is the only place the product is argued at length,
and every rule it quotes is a rule that is actually in `templates/`.

## Rules

- **The four trust claims are quotations, not copy.** "Nothing is claimed from a name", "nothing is
  described unread", "the map checks itself" and "the code wins" are what `templates/bootstrap.md`
  and `templates/memory.md` instruct — including what the self-check covers, which is enumerated
  here and has to stay the same list. The two blockquotes, *"Never describe what you did not
  read."* and *"If `.ds/` and the code disagree, the code wins."*, are literal lines of the
  templates.
- **The table says what it measures and nothing more**: time, tokens and cost, one run each, on a
  named 15-file fixture.
- **The eval paragraph reports `demo/eval` as it came out**: no accuracy difference on the fixture,
  the context cost it added on `tax-impact`, the grading error, and that a large repository is not
  measured. If a re-run changes the numbers, the paragraph changes with them.
- **"What it won't do" is the same list as the card's pills and the security policy.**
- **Every use it claims is an instruction the block really gives**: answering, planning, reading a
  feature's rules before an edit, reviewing by feature.
- **It shows the shape of `.ds/`, never a feature file's frontmatter or sections.**

## Behaviour

- The install is four lines above the fold — `npm i -g dspec`, `dspec init`, then `/ds-bootstrap`
  — followed by "That's it. That's the whole tool."
- *The problem* is the grep for "discount" that opens every file mentioning the word, and an answer
  assembled from them in one confident voice.
- The three-read walkthrough goes `index.md` → `features/apply-discount.md` → the source file, and
  its question is *when* checkout refuses a second code.
- The cost table still quotes the recording's run, whose question was *"why does checkout reject my
  second discount code?"*; it changes when the recording is re-made.
- Two tables carry the whole surface: terminal versus agent, and per agent where the command lands
  and which memory file it reads. A paragraph under them covers mapping a large repository a part
  at a time.
- "dspec is not a workflow" closes on where dspec sits: search tools find where code is, spec tools
  agree what to change next, dspec is what the code already is, where each part lives and what a
  change must not break. Tools are named by kind, never by product.
- "Feedback wanted" sits before Contributing and puts the one bet — prose no schema validates,
  held up by *the code wins*, *nothing is described unread* and anchors — to the reader, pointing
  at Discussions.
- Upgrading from 0.1.x is a collapsed `<details>` pointing at the changelog.
