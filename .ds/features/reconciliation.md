---
name: Reconciliation
area: The loop
code: [src/cli/commands/sync.ts, src/cli/commands/accept.ts]
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
creates the base files when there are none yet, restores any that have gone missing, measures
features never measured, re-renders the artifacts, and reports everything only a person can settle
— then `dspec accept` records, by name, that somebody read a drifted feature and its code and the
two agree again. The loop
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
- **Measure; never accept.** `--write` stamps only features that have no current stamp. A feature
  whose code changed after its stamp stays stale until `dspec accept` names it: re-stamping it
  mechanically erased every "description older than its code" before the report that would have
  shown it was built, so the finding this tool exists for never once reached anybody.
- **Do not rewrite prose.** Fingerprinting and re-rendering are mechanical and
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
- A brief mode skips reading the code for the session hook, and that includes drift: it reports
  uncommitted model edits, features with no body and artifacts that have fallen behind. It cannot be
  combined with `--strict`, because a gate over a report that never looked at the code would pass on
  drift it never measured.
- A second `--write` over an unchanged checkout writes nothing: an artifact is written only when its
  content differs.
- Flags are parsed strictly: a mistyped `--stirct` is an error, never a silent pass. Under `--json`
  progress goes to stderr, so stdout is one parseable document.
- Accepting takes exact names, as `dspec spec` resolves them, and refuses a name the model does not
  have: accepting a guessed feature would assert freshness for a description nobody read. `--all`
  accepts every stale feature, for the reviewed-refactor case, and is spelled out so nobody reaches
  it by accident.
