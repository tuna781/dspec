---
name: Body vocabulary
area: Language
code: [src/model/language.ts, src/model/sections.ts]
entry: renderLanguageBlock
tests: [test/model/language.test.js]
stamp: sha256g:786764d603e0b472
---

The single declaration of the model's vocabulary — the frontmatter keys a feature file may
declare, the body labels it may use, their glosses and their examples — and the generator that
renders them for an agent: `dspec sync --guide` in full, and one line in the bootstrap command. Before this file the label set
was hand-written in seven places: seven copies of a vocabulary the linter penalises against, and a
user who read a drifted copy was penalised for following the documentation.

Rules
- **Declared once, generated on demand.** No document teaches the vocabulary — the model is internal
  — so the only full rendering is `dspec sync --guide`, printed when an agent is about to write. A
  hand-written copy in a command is caught by `test/model/language.test.js`.
- **The labels are parsed vocabulary, not interface text, and are always English.** Recognition
  lowercases a line and compares it against this set, so translating a label would change the
  syntax of the language and every existing model would stop parsing.
- **A label is a bare line of text, not a heading.** Agents are taught to write the label and drop
  straight into bullets, so recognition keyed to a markdown heading would report a false negative
  on every agent-written body. A heading form is accepted too, because punishing correct content
  over a choice of font size is a bad rule.

Behaviour
- Renders at three depths: `line` for tight spaces, `table` for label plus gloss, and `full` for the
  table plus the filter rule, the link rule and a worked example body.
- Two predicates back the quality rules and differ deliberately: "does any label exist" and "does
  this label have a non-blank line under it". Typing a bare label to silence a warning is exactly
  the reflex the second one refuses to teach.
- Prose standing before the first label is kept as its own slice, never discarded — a body that does
  not yet follow the vocabulary must still yield all of its text.
