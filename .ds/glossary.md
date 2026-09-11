# Glossary

Words that mean something specific in dspec. Where a word is used loosely elsewhere, the
definition here is the one the code implements.

**Feature** — the unit of dspec-lang. One file under `.ds/features/`, one name, one list of the
files it lives in. The thing a person names when they say "feature A".

**Area** — a label that groups features in the index. Free text, and *not* a boundary: nothing is
filed inside an area, and changing one moves no file.

**Stamp** — the fingerprint of a feature's `code:` files, written by `ds sync` and never typed. Its
`sha256n:` prefix marks the normalisation generation, so a stamp from an older dspec reads as
*not measured* rather than as drift.

**Drift** — the code a description points at has moved, vanished, or changed since the description
was written. Five kinds: `moved`, `lost`, `spec older than code`, `evidence gone`, `not measured`.

**Gap / unclaimed code** — the opposite direction: a tracked source file that no feature describes.
Most unclaimed files should stay unclaimed; which ones deserve a description is a judgement the
tool does not make.

**Normalisation** — what is stripped before hashing: line endings, comments, trailing whitespace,
blank lines, and the *width* of indentation. Indentation *structure* and in-line spacing are kept,
so running a formatter is not drift but flattening a nested block is.

**Pack** — the answer `ds spec` assembles for one piece of work: the product rules, the feature, the
features it uses, and an explicit warning wherever the model is too thin to trust.

**Artifact** — a file rendered from the model (`.ds/index.md`, `CLAUDE.md`, `.claude/rules/*`,
`ds.json`). Generated, never hand-edited, and stamped so staleness is measurable.
