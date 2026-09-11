---
name: Spec file format
area: Language
code: [src/model/yaml.ts, src/model/frontmatter.ts]
entry: parseDoc
tests: [test/model/yaml.test.js]
stamp: sha256f:b0cfc607c8e2ed3e
---

Every file in `.ds/` is markdown with YAML frontmatter, parsed by a hand-written YAML subset with
zero dependencies. The subset exists because a full YAML library is a dependency, and because
supporting less makes the failure modes namable.

Rules
- **Machine metadata above the fence, prose below it — never mixed.** `code`/`stamp`/`tests` are
  data; the body is what an agent reads as law. Mixing the two invites an agent to read a file path
  as a business constraint.
- **Unsupported syntax throws; it is never skipped.** A parser that returns `{}` on syntax it does
  not recognise makes `code:` vanish silently, and a feature that is bound but reads as unbound
  drops out of every report while nothing says so.
- **An opening `---` with no closing one is an error**, not "treat the file as having no
  frontmatter". That is what a half-finished edit looks like, and swallowing it loses the binding.
- **`dumpYaml` must be the exact inverse of `parseYaml`.** The CLI rewrites frontmatter when it
  writes a stamp; a serialiser that drops a key or changes a type eats the user's words on every
  sync. A round-trip test locks this.

Behaviour
- Supported: maps nested by indentation, block sequences, flow sequences `[a, b]`, quoted and plain
  scalars, and quote-aware `#` comments.
- Rejected with a line number: tab indentation, block scalars `|` and `>`, flow maps `{a: b}`,
  sequences nested inside flow sequences, duplicate keys, empty keys, unclosed quotes, and
  inconsistent indentation.
- Only plain decimal integers and floats become numbers — `2026-08-23` and `1.2.3` stay strings,
  which is why `Number()` is not used.
- Serialising **drops every empty value**: `code: []` reads as "an empty list was declared" when the
  truth is "none was declared", and those two must not look the same.
- Comments do not survive a rewrite. Guidance written as a `#` comment therefore lives exactly
  until the first stamp is written, which is the intended lifetime for scaffolding notes.
