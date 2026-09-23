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

- **The stack is Node and nothing else.** TypeScript in `src/`, strict, compiled to CommonJS in
  `dist/`; Node 20 is the floor because `node:util.parseArgs` and `node:test` are what stand in
  for an argument parser and a test framework. Tests are plain `node:test` JavaScript against the
  built CLI, run as a real process.
- **Zero runtime dependencies.** A pull request adding one to `dependencies` has to argue for it
  first.
- **Everything is local, and nothing touches the network.** No server, no token, no telemetry, no
  version check — not in any command. Upgrading goes through the user's own `npm`, which they run
  themselves.
- **Report, never block.** Ordinary work exits 0 — a usage error exits 2 and an unexpected
  exception exits 1, and nothing else is non-zero. A tool that reddens on ordinary work teaches
  people to route around it.
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
- **Instructions live in `templates/`, once.** Every rule an agent is asked to follow — how to
  build the map, how to read it, how to keep it true — is written in `templates/bootstrap.md` or
  `templates/memory.md` and nowhere else. The feature files for those two describe what they are,
  what depends on them and why they say what they say; they do not restate what they say. A rule
  in two places is a rule that will be edited in one. The single exception is the README, whose
  four trust claims are marked as quotations and are checked against `templates/` — a repeat that
  names its source can be verified; one that reads as its own rule cannot.
- **The map is internal.** No document names or teaches its format to the user; what an agent needs
  in order to write it is in the bootstrap command it runs. The README may show the shape of `.ds/`
  — never a feature file's frontmatter or sections.
- **The map records what it does not know.** A description nobody read the code for, and a doubt
  written around rather than written down, are the two ways a map starts lying. `## Unsettled` is
  where the second one goes; it marks the edge of what the map knows and is never a list of work
  to do.
- **The git tag is the version, and nothing else is.** Nobody bumps a version by hand and nobody
  tags; `npm run release <tag>` writes the number everywhere it is read and puts the tag on the
  commit that shipped. One fact in several places, kept in step by hand, drifts within the hour.
- **One set of facts across every surface.** The README, the social card, the help text, the
  security policy and `templates/` make the same claims in the same words — zero dependencies,
  nothing on the network, only what carries the mark. A claim that lives in one place can be
  corrected; the same claim in five places, each phrased its own way, cannot.
- **English only** — code, comments, CLI output, docs and templates.

## Vocabulary

- **The map** — everything under `.ds/`: the index, the product file, and one file per feature.
- **Feature** — something a person would name: a capability of the product, or a piece of how the
  repository is built and shipped. Not a directory, not a class, not a layer.
- **Anchor** — a name a feature file sends a reader to instead of a bare path: a function, a
  route, an error message, a heading. It has to be text somebody read in that file, so one search
  finds it — which is also what makes a search that stops finding it worth something.
- **Kind** — which of those two a feature is: `product` or `repo`. It is what the index leads with,
  so a session answering a question about the product can stop reading half way.
- **Agent** — a coding assistant dspec installs into: Claude Code, Codex CLI, Cursor.
- **Memory file** — the file an agent reads at the start of every session without being asked:
  `CLAUDE.md` for Claude Code, `AGENTS.md` for the other two.
- **The mark** — the `dspec:managed` comment carried by every file dspec installs, and the only
  thing that makes a file dspec's to delete.
- **The block** — the region of a memory file between `<!-- ds:begin -->` and `<!-- ds:end -->`.
  The only part of that file dspec may write.
- **The fixture** — `demo/shop`, the small storefront the recording and the README's figures are
  made against. It stands for a repository that has already run `dspec init` and `/ds-bootstrap`.
