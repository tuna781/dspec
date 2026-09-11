---
name: Drift detection
area: Code measurement
code: [src/code/staleness.ts]
entry: computeStaleness
uses: [Code fingerprint, Source inventory, Model loading]
tests: [test/reconcile/drift.test.js]
stamp: sha256f:a662946d4ca5e6c8
---

Walks the model and asks, of every feature: do the files it names still exist, is its reading entry
still there, do its tests still exist, and has any of it changed since the description was written.
Every answer is read from the checkout.

Rules
- **Drift is reported, never auto-fixed.** A description older than its code is where the **code is
  the unreviewed party** — somebody changed the implementation and has not yet said whether the
  rule changed with it. Rewriting the description to agree would discard a decision silently, and
  almost always the wrong way round.
- **Never fingerprinted means nothing is known.** Report it as unmeasured. Letting it look like
  "measured and fine" is the silent failure.
- **A stamp from an older dspec is not drift.** It was taken under a different definition of the
  input, so it reports as unmeasured — otherwise the first report after an upgrade fills with drift
  nobody caused.

Behaviour
- Evidence is checked **first and unconditionally**: a test claimed as proof that no longer exists
  is reported even when the code files are gone too. Folding the two into one branch would silence
  the second exactly when it matters most.
- A missing `code:` file stops the walk for that feature: with the file list wrong, freshness is
  unknowable, and saying anything about it would be a guess.
- A lost `entry:` is hunted for in the rest of the tracked source, so the report can say where it
  went rather than leaving the reader to grep for it.
- A feature with no body is not reported as unmeasured: it is never stamped, so that would be a
  second finding for one state — and the quieter, less actionable of the two. The quality rule
  already says what is wrong and what to do about it.
- It is reported by `dspec sync`, never by a verb of its own. A command that existed only for one
  hook answered a question another command already answered, and two commands deciding separately
  what counts as stale is how they come to disagree.
- Only two of the five kinds are resolved by re-stamping; the rest need a person, and the report
  says which is which.
