---
name: Model loading
area: Language
code: [src/model/load.ts, src/model/types.ts]
entry: loadModel
uses: [Spec file format, Body vocabulary]
tests: [test/model/load.test.js]
stamp: sha256f:5525554a6407f4da
---

Turns `.ds/` into the one structure every other feature reads. One element is one file and the path
is predictable, so an agent that needs one feature reads exactly one file rather than loading the
whole model — that is the entire reason the format exists.

Rules
- **A wrong type means skip that value, never throw** — except where skipping would amount to
  lying. Frontmatter is typed by humans and agents, so wrong shapes are ordinary, and one malformed
  file must not destroy the output that would tell the user where they mistyped.
- **Unknown keys are dropped, never fatal.** A binding carrying an extra key somebody invented is
  still a real binding, and failing the whole load over it punishes the wrong person.
- **A structural problem that could not be honoured is recorded, never swallowed.** The loader
  repairs what it can to stay usable and reports the repair as a diagnostic, because a model that
  silently differs from what the author wrote is the failure this product exists to prevent.

Behaviour
- Feature files are walked **recursively**: a subfolder under `features/` is a human convenience and
  carries no meaning, so a model can be reorganised on disk without changing a word of what it says.
- Files and directories beginning with `.` are skipped; everything is read in sorted order.
- An element with no `name:` is named from its filename — `drift-detection.md` becomes
  `Drift detection`.
- A feature identifies its own file by object identity, never by name. Keying by name collapses two
  same-named features onto one file, and the stamp writer would then put one feature's fingerprint
  into the other's — a wrong value that reads exactly like a right one.
