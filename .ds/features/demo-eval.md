---
name: Demo evaluation
area: Demo
kind: repo
checked: 2026-09-23
code:
  - demo/eval/README.md
  - demo/eval/run.sh
  - demo/eval/judge.sh
  - demo/eval/report.js
  - demo/eval/tasks/reprice.prompt
  - demo/eval/tasks/reprice.rubric
  - demo/eval/tasks/list-price-tax.prompt
  - demo/eval/tasks/list-price-tax.rubric
  - demo/eval/tasks/mixed-cart.prompt
  - demo/eval/tasks/mixed-cart.rubric
uses: [Demo fixture]
---

Whether the map changes what an agent *plans*, not only how it answers. `run.sh` asks real
`claude -p` sessions to plan a change one of the fixture's recorded decisions rejected, with and
without `.ds/`, three times each; `judge.sh` has a separate session grade every answer blind against
the task's rubric; `report.js` prints the table. The README's planning claim quotes its result.

## Rules

- **Every session runs outside this repository**, in a `mktemp` copy of `demo/shop`, for the reason
  the recording does: Claude Code reads `CLAUDE.md` from every parent directory, and a session
  inside the repository would inherit dspec's own block — the "without" condition would stop being
  a baseline.
- **The grader never sees the condition.** It gets the request, the rubric and the answer's text.
  Its one-line reason is kept beside every answer so any grade can be checked by hand.
- **Sessions are read-only.** `--allowedTools` names read tools and `--disallowedTools` removes
  the editing ones, so a session that decides to act anyway cannot change the copy under it.
- **A task needs a decision the fixture actually records.** Each rubric's answer key is a bullet
  under some feature's `## Decisions` in `demo/shop/.ds/`; change one and the task that tests it
  has to change too.
- **Results are published whole.** A run's directory is committed with every answer and grade,
  ties included.

## Behaviour

- Three tasks: `reprice` (a control — the reason is visible in `computeTotals`), `list-price-tax`
  (a code comment states the rule; the map adds that it was a rejected option), `mixed-cart` (only
  the map says the rejection was chosen and why).
- The two decision tasks share one scale: 2 names the behaviour as deliberate and asks before
  changing it, 1 does one of the two, 0 plans the change.
- Costs two sessions per task per run plus one grading session per answer, on the runner's account.

## Decisions

- **The first rubric was too lenient and was tightened before the reported run.** It credited
  "totals will go up" as raising a concern, and scored a plan that simply proceeded the same as one
  that stopped to ask. The smoke run that exposed it is not reported.
- **`list-price-tax` was kept although it ties.** It shows where the map adds nothing — a decision
  the code already states — and dropping it would leave only the task that favours the map.

## Unsettled

- Three runs per cell on a 15-file fixture. Nothing here measures a large repository, a legacy one,
  or an agent other than Claude Code.
