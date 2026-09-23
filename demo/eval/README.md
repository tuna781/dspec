# Does the map change what an agent plans?

The recording measures one thing: how an agent *answers* a question, and what that costs. This
directory measures the claim the README makes next — that an agent with the map **plans with the
decisions in view**, and doesn't quietly undo what somebody chose on purpose.

```bash
cd demo/eval
./run.sh 3        # 3 runs of every task, with and without the map, then blind grading
```

Each task asks a real `claude -p` session, in a throwaway copy of [`../shop`](../shop), to plan a
change that one of the fixture's recorded decisions rejected — and not to edit anything. Every
session runs outside this repository, for the same reason the recording does: Claude Code reads
`CLAUDE.md` from every parent directory, and a session inside `demo/shop` would inherit dspec's own
block.

A separate session grades each answer against the task's rubric. It is shown the request, the
rubric and the answer, and never which condition produced it.

## The tasks

| task | what it asks | where the reason lives |
|---|---|---|
| `reprice` | stop re-pricing checkout after a code, subtract the discount instead | **in the code** — the tax and floor steps are visible in `computeTotals`. A control: both conditions should score well. |
| `list-price-tax` | charge tax on the list price | a comment says *what* (tax on the discounted amount); only the map says it was a **rejected option** and why |
| `mixed-cart` | discount only the eligible lines of a mixed cart | a comment half-says why; only the map says it was **rejected** and what non-discountable goods are |

The two decision tasks are scored on one scale: **2** — names the current behaviour as deliberate
*and* asks before changing it; **1** — one of the two; **0** — plans the change. The rubrics are in
[`tasks/`](tasks/).

## Results

Run of 2026-09-23, three runs per cell, Claude Code 2.1.280 on its default model, graded by Sonnet.
Raw answers and every grade with its reason are in [`results/20260923-133040/`](results/20260923-133040/).

| task | map | scores (0–2) | mean score | mean time | mean cost |
|---|---|---|---|---|---|
| list-price-tax | without | 2 2 2 | 2.00 | 27s | $0.17 |
| list-price-tax | with | 2 2 2 | 2.00 | 26s | $0.19 |
| mixed-cart | without | 1 0 1 | 0.67 | 33s | $0.19 |
| mixed-cart | with | 2 2 2 | 2.00 | 36s | $0.23 |
| reprice | without | 2 2 2 | 2.00 | 26s | $0.17 |
| reprice | with | 2 2 2 | 2.00 | 23s | $0.18 |

- **`mixed-cart` is the one that separates them: 2.00 with the map, 0.67 without.** All three
  sessions with the map named the rejection as a decision made on purpose, gave its reason, and
  asked before removing it. None of the three without it did: they read every file, and planned
  the removal. One of them found a real gap the map does not record — `redeemCode` never calls
  `validateCheckout` — which is a fair reminder that reading everything finds things too; what it
  could not find is *why* the check exists.
- **`list-price-tax` tied, and that is the honest result.** The code comment *"Tax is charged on
  the discounted amount, not the list price"* was enough for every session without the map to
  treat the rule as deliberate and ask first. Where the code states the decision, the map adds
  nothing to the plan.
- **`reprice`, the control, tied as expected**, at the same cost within noise. The map did not make
  any plan worse.
- **Cost is not the story here.** On fifteen files the no-map session reads the whole repository in
  a few turns, so time and cost are level. The recording's cost gap comes from a question that
  sends the no-map session searching; these tasks mostly do not.

## What this does and does not show

- It is a **15-file fixture**. A session without the map can read all of it in a few turns, so
  anything the code states, both conditions find. The difference that remains is what the code
  cannot state, which is exactly what the map is for. On a larger repository a session without the
  map reads a smaller share of the code, so it is likely to miss more — but this does not measure
  that, and nothing here should be read as if it did.
- **N is small** and sessions are not deterministic. Treat a difference of one run as noise.
- The grader is a model. Its one-line reason for every grade is kept next to the answer in
  `results/`, so any grade can be checked by hand.
- The rubric rewards *asking* before undoing a decision. That is a judgement about what a good plan
  does; a reader who thinks an agent should just proceed will weigh the scores differently.
