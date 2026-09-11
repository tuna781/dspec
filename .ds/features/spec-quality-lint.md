---
name: Spec quality lint
area: Model quality
code: [src/compile/lint.ts, src/cli/lintMessage.ts]
entry: lintModel
uses: [Model loading, Body vocabulary, Coverage gap, Drift detection]
tests: [test/model/lint.test.js]
stamp: sha256f:3a2290cddeffba9c
---

A pure function over the model that teaches the standard the way a linter does — nobody reads a
style guide, everybody fixes the red underline. It never blocks a compile and it never appears in a
pack.

Rules
- **A lint finding is a judgement about description quality, not a disagreement with the code.** It
  is reported and it never fails a build.
- **The same name in two areas is not an error.** That is a correct boundary working: `Customer` in
  sales and `Customer` in support are two models that share a name, and the answer is to translate
  between them, not to merge them. A rule penalising collisions outright would push users towards
  one shared normalised model — the exact opposite. So the near-duplicate rule fires only with the
  extra evidence that the two really are one concept split in half.
- **One name inside one area is a different matter.** Nothing downstream can tell the two apart: a
  link reaches only the first, and the fingerprint has to pick a file. Only the author can say which
  is which, so it has to be said rather than swallowed.
- **The rule list is an array so the count is derived, not typed.** Four hand-kept copies of "N
  rules" disagree the first time a rule is added, and the user reading a stale number is being told
  something false by the tool itself.

Behaviour
- Quality is asked in three escalating questions: does this say anything at all; does it say it with
  structure; and what is the evidence. The third is the hardest — a well-formed body, bound to the
  right code, with a fresh stamp and no test ever running through it, is still only an assertion,
  and an agent reading it will trust it completely because it looks exactly like a verified law.
- Nothing is penalised until the description is bound to code. Writing the description before the
  code exists is not an error; it is just not yet time.
- Emptiness is caught, never length. A character count would only teach people to pad.
