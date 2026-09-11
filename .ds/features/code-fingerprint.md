---
name: Code fingerprint
area: Code measurement
code: [src/code/hash.ts, src/cli/commands/stamp.ts]
entry: stampFiles
uses: [Model loading]
tests: [test/code/hash.test.js]
stamp: sha256f:78624138424d7d85
---

Turns "is this description still true of the code?" into a measurement. The CLI reads the files
from disk itself and computes the fingerprint, so a `stamp` stops being a claim anyone has to
trust — which is what replaced the older loop where an agent computed the value and reported it,
and nobody could check.

Rules
- **Fingerprint files, never symbols.** Extracting a symbol body by counting braces and measuring
  indentation, and that was the only place dspec guessed: a signature spread over several lines
  could not be located, and the description then reported as broken forever. A file has no such
  ambiguity. The cost is honest and stated: an edit to a shared file marks every feature claiming
  it as stale.
- **The generation lives in the prefix.** Changing what gets hashed changes every value, and a
  feature carrying an older fingerprint is not evidence its code moved — it is evidence it was
  measured with a different ruler. Without the marker, every described feature in every repo would
  report as stale on the first run after an upgrade.
- **Normalisation is conservative, and the asymmetry is deliberate.** A false positive is noise
  that teaches people to ignore the report; a false negative — calling changed code unchanged — is
  the silent failure this product exists to prevent.
- **Writes the stamp and nothing else.** Never `tests:`: guessing that `drift.ts` is proven by
  `drift.test.js` turns "nobody proved this" into "this is proven", the dangerous direction, and it
  fails silently.

Behaviour
- Stripped before hashing: line endings, comments, trailing whitespace, blank lines, and the *width*
  of indentation. Running a formatter is therefore not drift.
- Kept: indentation *structure*, so a nested block and a flattened one still differ; and spacing
  inside a line, because without parsing there is no way to tell code spacing from the inside of a
  string literal.
- The input is `path:hash` lines **sorted by path**, so reordering a `code:` list is not a change.
- **A feature with no body is never stamped.** A stamp asserts "this description is current for
  this code", and a description that says nothing cannot be current — stamping it would make an
  empty file report as measured and fine, which is the "unmeasured must never look fine" rule
  turned exactly inside out. It also gives the scaffolding comments a life: they are stripped
  whenever frontmatter is rewritten, so stamping a fresh scaffold erased the guidance before the
  user ever opened the file.
- A file that cannot be read yields **no stamp at all**. Stamping the files that happen to exist
  would produce a value that looks measured, matches on the next run, and quietly asserts freshness
  for a feature pointing at something that is gone.
