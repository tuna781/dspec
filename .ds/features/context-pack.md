---
name: Context pack
area: Retrieval
code: [src/compile/pack.ts, src/cli/commands/spec.ts]
entry: renderPack
uses: [Model loading, Spec quality lint, Drift detection]
tests: [test/render/pack.test.js]
stamp: sha256f:57294ea7926f78bc
---

How a piece of work reaches the model: given a request, assemble what the model already knows — the
product rules, the feature named, the features it uses, the files bound to them, and an explicit
warning wherever the model is too thin to trust.

Rules
- **A lookup, not a search.** Matching a request against every element name by word overlap
  produced the failure this is shaped around: asked about *"fingerprint the code and report drift"* it
  matched the word "Report" — a private helper in an unrelated file — returned that file as the
  code map, and told the agent everything else was unaffected. A false scope, asserted as authority.
- **Word overlap may suggest; only a name may scope.** The rule is about PLACEMENT, not scoring.
  A request naming no feature is told so, then offered features ranked by words they share — under
  a heading that calls the ranking a guess, outside any code map, with the words it matched printed
  so the reader judges rather than trusts. A weak match labelled weak is not a false scope; a weak
  match promoted into the code map is the failure this module is shaped around. Word overlap is
  only dangerous when it is allowed to speak with authority, so it is never given any.
- **The complete listing always survives, and sits below the guesses.** The ranking is a guess; the
  full list is the truth, and a reader who distrusts the guess must not have to ask for it.
- **A dependency's RULES are never trimmed away.** The pack exists partly to surface the rule a
  request contradicts, and that rule is often a dependency's. Trimming to make the pack smaller
  must not hide the thing it is here to show — the same failure as a warning that switches off when
  it is needed. Behaviour describes the inside, and the inside belongs to that feature's own pack.
- **A resolved request gets no guesses.** Printing them beside a real code map would blur the one
  line the module exists to hold.
- **The warning block comes before the rules it qualifies.** A reliability warning read after the
  content it applies to has already failed to do its job.
- **"The absence of a warning is not evidence that a description is current" is not removable.** An
  agent that reads no warnings as "all current" has been misled by omission.

Behaviour
- Resolution has two tiers, both exact: the request IS a feature name, or a feature's whole name
  occurs inside it on word boundaries. A name inside a sentence is a statement the writer made; an
  overlapping token is a coincidence — which is why the coincidence is only ever offered, never
  resolved.
- Suggestions weight a hit in the feature's own NAME above one in its body: a word somebody chose
  to call it by is stronger evidence than a word that appears in a paragraph, and without the
  weighting the most verbose feature outranks the right one whatever you ask.
- `code:` paths are searchable, so a filename in the request reaches the feature that owns it even
  when its prose never says the word.
- The closure is depth 1 over `uses:` — declared dependencies, so it cannot silently miss one.
- A **seed** is rendered whole; a **dependency** is rendered as a contract — name, files, entry,
  lead and rules, then the command that fetches the rest. Measured on this repo, the closure was
  58% of the pack: every dependency at the same fidelity as the feature being worked on, which is
  the wrong thing to spend a context window on.
- Nothing is unreachable: `--touch` promotes a dependency to a seed and renders it whole, and each
  contract names that command rather than leaving the reader to remember it.
- Trimming prose is not a scope change — the Code Map still spans seeds and dependencies alike, so
  "files not listed here are unaffected" keeps meaning what it says.
- `--touch` seeds a feature by name and always wins outright over what the request resolved to; a
  seed that resolves to nothing is reported, never dropped.
