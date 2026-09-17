---
name: dspec
---

dspec keeps a product's model in the repository, so that an AI coding agent can learn what a
feature is, where it lives in the code, and what it touches — without reading the codebase. The
model is internal: the agent builds it, reads it and keeps it current, and the user only ever types
three commands — `/ds-bootstrap`, `/ds` and `/ds-update`.

The problem it exists for: `CLAUDE.md` is what carries knowledge across an empty context window,
and nothing checks that it is still true. dspec binds every description to real files and
fingerprints them, so *"is this still true?"* is answered by reading the checkout rather than by
anyone remembering.

Rules
- **Zero runtime dependencies.** A pull request adding one to `dependencies` has to argue for it
  first.
- **Everything is local.** No server, no token, no telemetry, and no network call — except
  `dspec update`, which asks npm for a newer dspec when the user runs it, through their own `npm`.
  Every other command reads `.ds/` and the user's own source files, and nothing else.
- **Measure, do not trust.** Anything the tool asserts about the code must be re-readable from the
  checkout. A claim nobody can check does not go in a report.
- **Report, never block.** Nothing exits non-zero unless asked for it — `dspec sync --strict` is the
  only gate, and it is opt-in. A gate that reddens on ordinary work teaches people to route around
  it. No hook ever blocks the user or a tool call; the Stop hook may hold the AGENT, once per turn,
  to finish bringing the model up to date.
- **Derive, never store.** Anything computable from the model, the checkout and git is computed on
  demand. Every stored duplicate eventually disagrees with its source.
- **Say what you do not know.** An unmeasured description is reported as *unmeasured*, never as
  fine. A warning that switches off when it is most needed is worse than no warning.
- **English only** — code, comments, CLI output, docs and seeded templates.
- **The model is internal.** No document names or teaches its format; what an agent needs to write
  it comes from `dspec sync --guide`. The user is told about features and behaviour, never files.
- **The agent keeps the model current, without asking.** After any change, it reads every
  description older than its code, rewrites it and accepts it, and describes new code. A
  description is never accepted unread.
- **Every agent, one surface.** Three commands in every agent. The CLI is the whole tool; a slash
  command is prose telling an agent which CLI command to run and what to judge in its output. A new
  agent is therefore an adapter over frontmatter, never a second implementation — and the automatic
  half, session hooks, is Claude Code only because no other agent can run a command on a session
  event. That gap is reported, never papered over.
- **dspec owns what carries its mark, and nothing else.** `dspec init` writes into repositories and
  home directories it does not own. Everything it installs carries `dspec:managed`, and every run
  deletes all of it and writes it again, so an upgrade leaves nothing stale and nothing a newer
  version dropped. A file without the mark is never written or removed — whatever its name — and in
  a settings file only dspec's own hook entries are.
