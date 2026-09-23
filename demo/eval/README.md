# Does the map make answers about the code more accurate?

The recording measures how an agent *answers* one question, and what that costs. This directory puts
three lookup questions about [`../shop`](../shop) to real `claude -p` sessions, with and without its
`.ds/` map, and grades every answer for being correct, complete, and free of anything the code does
not support.

```bash
cd demo/eval
./run.sh 3        # 3 runs of every task, with and without the map, then blind grading
```

Every session runs in a throwaway copy of the fixture outside this repository — Claude Code reads
`CLAUDE.md` from every parent directory, and a session inside `demo/shop` would inherit dspec's own
block. Sessions are read-only. A separate session grades each answer against the task's rubric; it
is shown the request, the rubric and the answer, never which condition produced it.

## The tasks

| task | what it asks | answer key |
|---|---|---|
| `second-code` | when is a second discount code refused, and what comes back | `stackingAllowed`, `not_stackable` with `conflictsWith`, the order of checks |
| `tax-impact` | which files a tax change touches, and what uses the figure downstream | `tax.ts`, `totals.ts`, the two checkout callers, placing and refunding an order |
| `refund-limit` | how a partial refund is computed, and what stops one | the formula in `refund`, the zero-or-less check, and no other limit |

Every answer key is read from `shop/src`, never from the map — otherwise the map would be graded
against itself. One scale: **2** correct and complete with nothing invented · **1** correct but
incomplete · **0** wrong, or a claim the code does not support. The rubrics are in
[`tasks/`](tasks/).

## Results

Run of 2026-09-23, three runs per cell, Claude Code on its default model, graded by Sonnet. Raw
answers and every grade with its reason are in [`results/20260923-160425/`](results/20260923-160425/).
Context tokens are input plus cache writes plus cache reads, from each session's `usage`.

| task | map | scores (0–2) | mean score | mean time | mean context tokens | mean cost |
|---|---|---|---|---|---|---|
| refund-limit | without | 2 2 2 | 2.00 | 16s | 82,201 | $0.14 |
| refund-limit | with | 0 2 2 | 1.33 | 17s | 102,587 | $0.15 |
| second-code | without | 2 2 2 | 2.00 | 22s | 113,812 | $0.17 |
| second-code | with | 2 2 2 | 2.00 | 18s | 107,295 | $0.17 |
| tax-impact | without | 2 2 2 | 2.00 | 25s | 66,955 | $0.16 |
| tax-impact | with | 2 2 2 | 2.00 | 34s | 153,912 | $0.20 |

- **On accuracy, the map made no difference here.** Every session in both conditions found the
  answer key. The fixture is fifteen files: a session without the map reads all of it in a few
  turns, so it has nothing to miss.
- **The one 0 is a grading error, and the table keeps it.** `refund-limit.with.1` was marked down
  for "inventing" a code comment explaining why the discount is apportioned. That comment is in
  `shop/src/orders/refund.ts`. Read by hand, the answer meets the key and would score 2. It is
  reported as graded, rather than re-graded after the fact.
- **The map did not make these answers cheaper, and in one task it made them dearer.** On
  `tax-impact` the sessions with the map read the map *and* then traced the callers through the
  code, at about twice the context of reading the code alone. On `second-code` — the question the
  map's feature file answers directly — it was slightly faster and slightly cheaper. On
  `refund-limit` it was level.

## What this does and does not show

- It is a **15-file fixture**, where reading everything is cheap and complete. What the map is for —
  a repository too large to read in a session — is exactly what this does not measure, and nothing
  here should be read as if it did.
- **N is small** and sessions are not deterministic. Treat a difference of one run as noise.
- The grader is a model, and in this run it made at least one mistake. Its one-line reason for
  every grade is kept next to the answer in `results/`, so any grade can be checked by hand.
