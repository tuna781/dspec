---
name: dspec
---

dspec puts a map of a codebase into the repository it describes, so that an AI coding agent can
learn what a feature is and where it lives without reading the code. The map is internal: the agent
builds it, reads it and keeps it current, and the user is talked to about features and behaviour
rather than about files.

The problem it exists for: every session, an agent starts knowing nothing about the codebase, so it
searches — and the user pays for that search on every question. `CLAUDE.md` was meant to carry the
knowledge across an empty context window, but it is written once and then drifts. dspec makes the
map the agent's own responsibility and gives it one command to rebuild.

**dspec is not a workflow.** It imposes no process, no gate and no way of working. Version 0.2.0
removed everything that did: the spec-plan-build loop, the session hooks, code fingerprints, drift
detection, the linter and the strict gate. What is left is the part that was always the point.

## Rules

- **Zero runtime dependencies.** A pull request adding one to `dependencies` has to argue for it
  first.
- **Everything is local, and nothing touches the network.** No server, no token, no telemetry, no
  version check — not in any command. Upgrading goes through the user's own `npm`, which they run
  themselves.
- **Report, never block.** Nothing exits non-zero except a usage error. A tool that reddens on
  ordinary work teaches people to route around it.
- **dspec owns what carries its mark, and nothing else.** `dspec init` writes into repositories and
  home directories it does not own. Everything it installs carries `dspec:managed`, and every run
  deletes all of it and writes it again, so an upgrade leaves nothing stale and nothing a newer
  version dropped. A file without the mark is never written or removed — whatever its name — and in
  a memory file only the block between the markers is dspec's.
- **Installing and mapping are different intentions.** `dspec init` never reads or creates `.ds/`.
  Reading a codebase and deciding what its features are is judgement, and judgement belongs to the
  agent. One intention must not silently carry the other's power.
- **Every agent, one surface.** One command, the same spelling everywhere. A new agent is an
  adapter over a file path and a frontmatter shape, never a second implementation. Nothing is done
  for one agent that cannot be done for all three.
- **The map is internal.** No document names or teaches its format to the user; what an agent needs
  in order to write it is in the bootstrap command it runs.
- **English only** — code, comments, CLI output, docs and templates.

## Vocabulary

- **The map** — everything under `.ds/`: the index, the product file, and one file per feature.
- **Feature** — something a person would name: a capability of the product. Not a directory, not a
  class, not a layer.
- **Agent** — a coding assistant dspec installs into: Claude Code, Codex CLI, Cursor.
- **Memory file** — the file an agent reads at the start of every session without being asked:
  `CLAUDE.md` for Claude Code, `AGENTS.md` for the other two.
- **The mark** — the `dspec:managed` comment carried by every file dspec installs, and the only
  thing that makes a file dspec's to delete.
- **The block** — the region of a memory file between `<!-- ds:begin -->` and `<!-- ds:end -->`.
  The only part of that file dspec may write.
