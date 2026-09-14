---
name: Reconciliation
area: The loop
code: [src/cli/commands/sync.ts]
entry: cmdSync
uses:
  - Code fingerprint
  - Coverage gap
  - Work list
  - Artifact rendering
  - Model creation
  - Agent adapters
tests: [test/reconcile/sync.test.js]
stamp: sha256f:11d9800cdc018ddf
---

Reconciles the model with the checkout in **both** directions and repairs what is safe to repair:
creates the base files when there are none yet, restores any that have gone missing, re-stamps
every feature, re-renders the artifacts, and reports everything only a person can settle. The loop
it serves is code-first: describe, plan, build, and only then write the model — so the question at
the end is never "what did I fail to implement" but "where do the model and the repo now disagree".

Rules
- **One command, two starting points, told apart by whether `.ds/` exists yet.** This used to be two
  commands — one that created, one that repaired — split apart so "set this repo up" and "the model
  has drifted" could not be told apart. In practice there was only ever one question, so the split
  bought nothing but a command a user had to already know to reach for. `--write` on an empty repo
  proposes one feature per directory of source (Model creation) exactly once; on every run after,
  it never invents a feature — undescribed code is listed, never scaffolded, because which files
  deserve one is a judgement.
- **Only `--write` ever writes**, model missing or not. A dry run reports what would happen, never
  what happened.
- **Re-measure; do not rewrite prose.** Re-fingerprinting and re-rendering are mechanical and
  reproducible: run them twice and the answer is the same, and nothing a human wrote is lost.
  Rewriting a body so it agrees with the code looks like tidying and is actually a decision — that
  the code is right and the description was wrong — taken silently on behalf of whoever wrote it.
- **Never delete an element.** A description whose code is gone is reported, for a person to settle.
- **It exits non-zero only when asked.** `--strict` is the CI gate and nothing else turns it on: a
  command that failed by default would make every other use of it a hazard. Even then it fails only
  on measured facts — code without a description never reddens a build, because a gate that fires
  on every new file teaches people to route around it.
- **The code→model direction only ever lists.** Which undescribed symbols are worth writing down is
  exactly the judgement the tool has no way to make, so the report says *decide*, never *add*.

Behaviour
- Writing re-fingerprints first and renders second: rendering before measuring would stamp an
  artifact from values that are about to change.
- The report is built **after** the writes, so what is reported is the state the user is left in,
  not the one they arrived with.
- A brief mode skips the slowest half for the session hook, and deliberately keeps drift — the most
  valuable thing a session can open with. Skipping both to save time would hand back a hook that
  opens every session by announcing nothing is wrong.
