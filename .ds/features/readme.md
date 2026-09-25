---
name: Readme
area: Documentation
kind: repo
checked: 2026-09-25
code:
  - README.md
---

The argument for installing dspec, in the order somebody reads it — *The problem*, *The idea*,
*The map*, *What your agent does with it*, *Why you can believe the answer* — opening on the promise
that the agent knows the codebase like someone who has worked on it for years. It is the only place
the product is argued at length, and every rule it quotes is a rule that is actually in
`templates/`.

## Rules

- **The four trust claims are quotations, not copy.** "Nothing is claimed from a name", "nothing is
  described unread", "the map checks itself" and "the code wins" are what `templates/bootstrap.md`
  and `templates/memory.md` instruct — including what the self-check covers, which is enumerated
  here and has to stay the same list. The two blockquotes, *"Never describe what you did not
  read."* and *"If `.ds/` and the code disagree, the code wins."*, are literal lines of the
  templates.
- **It argues the concept and shows no evidence** — see `product.md`. No recording, no transcript
  of a session, no timings, token or cost figures: it says what the problem is, what the map holds
  and how the agent uses it.
- **"What it won't do" is the same list as the card's pills and the security policy.**
- **Every use it claims is an instruction the block really gives**: knowing what the user means by
  looking their words up in the map, answering, planning, reading a feature's rules before an edit, reviewing by
  feature.
- **It shows the shape of `.ds/`, never a feature file's frontmatter or sections.**

## Behaviour

- The install is four lines above the fold — `npm i -g dspec`, `dspec init`, then `/ds-bootstrap`
  — followed by "That's it. That's the whole tool."
- *The problem* is the agent as a stranger to the codebase: a search matches words, not meaning,
  the answer is assembled from whatever matched and delivered in one confident voice, and
  `CLAUDE.md` drifts.
- *The idea* is the long-time developer, and the four things they know without searching — which
  feature you mean whatever you called it, where it lives, what it does, what it touches — which
  dspec writes down for the agent.
- *The map* shows the shape of `.ds/`, then says what a feature is, that every feature knows its
  names (routes, error codes and messages, labels, events, tables, config keys, the user's own
  words once confirmed) and that every feature knows its files.
- Two tables carry the whole surface: terminal versus agent, and per agent where the command lands
  and which memory file it reads. A paragraph under them covers mapping a large repository a part
  at a time.
- "dspec is not a workflow" closes on where dspec sits: search tools find where code is, spec tools
  agree what to change next, dspec is what a long-time developer knows — what the code is, what
  each part is called, where it lives and what a change must not break. Tools are named by kind,
  never by product.
- "Feedback wanted" sits before Contributing and puts the one bet — prose no schema validates,
  held up by *the code wins*, *nothing is described unread* and anchors — to the reader, pointing
  at Discussions.
- Upgrading from 0.1.x is a collapsed `<details>` pointing at the changelog.
