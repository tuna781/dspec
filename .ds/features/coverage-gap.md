---
name: Coverage gap
area: Code measurement
code: [src/code/coverage.ts]
entry: computeCoverage
uses: [Source inventory, Model loading]
tests: [test/reconcile/gap.test.js]
stamp: sha256f:0ddad6bc5582dd12
---

The mirror of drift — **code nobody described**. Drift only ever finds problems in things somebody
already wrote down, so it is structurally blind to the failure this product exists to prevent: a
feature shipped that the model never mentions. The two together are what make reconciliation a
reconciliation rather than a one-way check.

Rules
- **Count files, not symbols.** Asking per declaration answers with hundreds of private
  helpers — a number nobody could act on, so nobody read it. A repository has tens of source files,
  and "no feature describes `src/git/rev.ts`" is a question a person can actually answer.
- **It observes; it never concludes.** Not every file deserves a feature. Which ones do is a
  judgement, and this makes none: it lists, and says so.
- **Silence is not the goal; honest volume is.** A repo that has never been described reports every
  file, and that number is the truth. What it must not do is print hundreds of lines — a report
  nobody can read teaches people to skim past the one line that mattered.

Behaviour
- Counts are always exact; the per-directory listing is capped and the remainder collapsed into a
  number.
- A file claimed by more than one feature is still covered once — shared infrastructure is a fact,
  not a conflict.
- Files a feature claims that are not source files at all — templates, manifests, hooks — are
  verified to exist but do not count towards coverage.
