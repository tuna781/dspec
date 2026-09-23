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
  - demo/eval/tasks/second-code.prompt
  - demo/eval/tasks/second-code.rubric
  - demo/eval/tasks/tax-impact.prompt
  - demo/eval/tasks/tax-impact.rubric
  - demo/eval/tasks/refund-limit.prompt
  - demo/eval/tasks/refund-limit.rubric
uses: [Demo fixture]
---

Whether the map makes an agent's answers about the code correct, complete and free of invention,
and what that costs. `run.sh` asks real `claude -p` sessions three lookup questions about the
fixture, with and without `.ds/`, three times each; `judge.sh` has a separate session grade every
answer blind against the task's rubric; `report.js` prints score, time, context tokens and cost.
The README's lookup claim quotes its result.

## Rules

- **Every session runs outside this repository**, in a `mktemp` copy of `demo/shop` — a session
  inside it would inherit dspec's own `CLAUDE.md` block.
- **The grader never sees the condition.** It gets the request, the rubric and the answer's text,
  and its one-line reason is kept beside every answer.
- **Sessions are read-only**: `--allowedTools` names read tools and `--disallowedTools` removes the
  editing ones.
- **Every answer key is read from `demo/shop/src`**, not from the map — otherwise the map would be
  graded against itself.
- **Results are published whole**, ties included.

## Behaviour

- Three tasks: `second-code` (when a second discount code is refused and what comes back),
  `tax-impact` (which files a tax change touches and what uses the figure downstream) and
  `refund-limit` (how a partial refund is computed and what stops one).
- One scale for all three: 2 correct and complete with nothing invented, 1 correct but incomplete,
  0 wrong or containing a claim the code does not support.
- Context tokens are `input + cache_creation + cache_read` from the run's `usage`.
- Costs two sessions per task per run plus one grading session per answer, on the runner's account.
- Three runs per cell on a 15-file fixture, Claude Code only.
- The run of 2026-09-23 (`results/20260923-160425/`): every cell scored 2.00 except `refund-limit`
  with the map, 1.33 — one 0 the README reports as a grading error. With the map, `second-code` was
  slightly faster and `tax-impact` used about twice the context tokens.
