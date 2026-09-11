---
name: Source inventory
area: Code measurement
code: [src/code/sources.ts]
entry: trackedSources
uses: [Git access]
stamp: sha256f:fc26754b6b02f138
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
- **Not a git checkout means an empty answer, never an error.** Coverage then reports nothing, which
  is honest — "I cannot see your files" must never render as "every file is described".

Behaviour
- Extensions that carry behaviour only. Markdown, JSON and configuration are described by the
  features that use them, and are verified to exist when claimed.
- Build and generated directories are excluded by name, at any depth.
