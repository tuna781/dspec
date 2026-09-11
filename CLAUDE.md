<!-- ds: project=dspec generated=2026-09-10T00:40:53.446Z -->
# dspec

This repository's product model lives in `.ds/`, written in dspec-lang.

**Start at `.ds/index.md`** — every feature, what it is, and which files it
lives in. Then read the one feature file you need; do not read the whole model, and do not
read this file to find out what a feature does.

dspec keeps a product's model as markdown in the repository, so that an AI coding agent can learn
what a feature is, where it lives in the code, and what it touches — without reading the codebase.
Everything under `.ds/` is written in **dspec-lang**; the language is specified in `README.md`.

The problem it exists for: `CLAUDE.md` is what carries knowledge across an empty context window,
and nothing checks that it is still true. dspec binds every description to real files and
fingerprints them, so *"is this still true?"* is answered by reading the checkout rather than by
anyone remembering.

## Rules

_Non-negotiable, and they apply to every change._

- **Zero runtime dependencies.** A pull request adding one to `dependencies` has to argue for it
  first.
- **Everything is local.** No server, no token, no network call, no telemetry. The CLI reads `.ds/`
  and the user's own source files, and nothing else.
- **Measure, do not trust.** Anything the tool asserts about the code must be re-readable from the
  checkout. A claim nobody can check does not go in a report.
- **Report, never block.** Nothing exits non-zero unless asked for it — `dspec sync --strict` is the
  only gate, and it is opt-in. A gate that reddens on ordinary work teaches people to route around
  it.
- **Derive, never store.** Anything computable from the model, the checkout and git is computed on
  demand. Every stored duplicate eventually disagrees with its source.
- **Say what you do not know.** An unmeasured description is reported as *unmeasured*, never as
  fine. A warning that switches off when it is most needed is worse than no warning.
- **English only** — code, comments, CLI output, docs and seeded templates.
- **Every agent, one surface.** The CLI is the whole tool; a slash command is prose telling an
  agent which CLI command to run and what to judge in its output. A new agent is therefore an
  adapter over frontmatter, never a second implementation — and the automatic half, session hooks,
  is Claude Code only because no other agent can run a command on a session event. That gap is
  reported, never papered over.
- **Add what is absent, never touch what is there.** `dspec init` writes into repositories and
  home directories it does not own. Not a file, not a key, not a line is ever replaced or deleted,
  and there is no flag that turns this off. The cost — an improved command never reaching somebody
  who already has one — is real, is stated to the user, and is the better failure.

---

_Generated from the model by `dspec sync`. Never edit this file by hand — it is overwritten._
