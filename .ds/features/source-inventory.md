---
name: Source inventory
area: Code measurement
code: [src/code/sources.ts]
entry: sourceInventory
uses: [Git access]
stamp: sha256g:1d49b3e6b9aa650c
---

Which files count as this product's source: the denominator of coverage, and the candidate set when
hunting for an entry symbol that has moved.

Rules
- **git's answer, filtered — never a directory walk.** An untracked build output or a vendored
  dependency would otherwise be reported as code nobody described, and a report full of things the
  user never wrote is a report the user stops reading.
- **A test file is not undescribed source.** A feature names its tests in `tests:`; counting a spec
  file here would ask the user to write a feature about their own test suite.
- **An agent's own directory is configuration, never the product.** `dspec init` writes hook scripts
  into `.claude/hooks/` and they are committed, so by every other measure they are tracked source —
  and the very next `dspec sync` asked the user to describe files dspec had just written for them.
  A tool that does that teaches people its coverage report is noise.
- **Not a git checkout means an UNKNOWN answer, never an error and never an empty one.** It is
  `null`, and coverage reports itself as not measured. An empty list once meant zero unclaimed
  files, and `dspec sync` printed "the model and the code agree" about code it had never seen.
- **Paths are read unquoted and NUL-separated.** git quotes a non-ASCII path by default, a quoted
  name does not end in its extension, and every such file silently stopped being source.

Behaviour
- Extensions that carry behaviour only. Markdown, JSON and configuration are described by the
  features that use them, and are verified to exist when claimed.
- Build and generated directories are excluded by name, at any depth.
- Callers that only search the inventory — hunting a lost entry, proposing features — may treat
  "unknown" as "nothing found"; coverage may not.
