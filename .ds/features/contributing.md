---
name: Contributing
area: Documentation
kind: repo
checked: 2026-09-23
code:
  - CONTRIBUTING.md
  - CODE_OF_CONDUCT.md
  - SECURITY.md
  - .github/PULL_REQUEST_TEMPLATE.md
  - .github/ISSUE_TEMPLATE/bug_report.yml
  - .github/ISSUE_TEMPLATE/feature_request.yml
  - .github/ISSUE_TEMPLATE/config.yml
  - LICENSE
---

How a change or a report gets in: one contract file, the forms that ask for what a maintainer will
need anyway, and a private channel for anything that is a vulnerability. Start at CONTRIBUTING.md —
it says outright that it is the whole contract and there is no second place to check.

## Rules

- **The non-negotiables are stated before the mechanics.** Zero runtime dependencies, no network
  call, not a workflow, report never block, owns only what carries its mark, one surface for every
  agent, English only. They are listed so that turning a good pull request down is a decision
  somebody could have read in advance rather than a surprise.
- **A contributor does not bump the version and does not tag.** The git tag is the version, cut at
  release time. Both the contract and the pull-request checklist say so, because the drift this
  prevents is invisible until somebody installs the published package.
- **Every user-visible change lands in `CHANGELOG.md` under `## [Unreleased]`.** That is the only
  source the GitHub Release notes are built from, so a change that skips it ships unannounced.
- **A security issue never becomes a public issue.** The advisory link is offered in the issue
  chooser itself, which is the only place somebody about to file the wrong thing is actually
  looking. Blank issues are disabled for the same reason.
- **The rules that are easy to get wrong are repeated where the mistake happens.** `templates/` is
  the one source of instructional text; only Claude Code honours `allowed-tools`; a new install
  location needs both `plan()` and `owned()` or an upgrade leaves it behind forever. These are in
  the contract and again in the checklist, because a reviewer reads the checklist.

## Behaviour

- The bug form makes `dspec --version`, the agent and the agent's version required, because each
  agent puts dspec's files somewhere different and half of all reports depend on that answer —
  asking up front saves a round trip that would otherwise cost a day.
- It ends by naming the case a reporter would otherwise misfile: if the agent ignored the map and
  searched anyway, that is dspec's prose not working, and it belongs here rather than against the
  agent.
- The feature form opens by ruling out process — a spec to write, a plan to approve, a gate to
  pass — and closes with four checkboxes that are the project's non-negotiables restated as
  questions the requester can answer themselves.
- The issue chooser routes anything that is not a bug or a concrete request to Discussions, so the
  tracker holds only things with a definite outcome.
- SECURITY.md narrows the surface before inviting anybody to look at it: no dependencies, no
  socket, no telemetry, no subprocess, no executable code installed, and `settings.json` only ever
  written to remove dspec's own entries. It also says fixes land on the latest release only, and
  that the retired Claude Code plugin is not a distribution channel any more.
- The licence is MIT, and is stated in four places that must agree: `LICENSE`, the `license` field
  npm's badge reads, the README's closing line and the card's last pill.
- The pull-request template asks for the *why* first, and one checkbox item is updating the `.ds/`
  feature file that claims the code being touched.

## Decisions

- **The pull-request template asks for the *why* first** on the grounds that reasoning is the part
  a later reader cannot reconstruct. It is the same reason a feature file has a `## Decisions`
  section.

## Unsettled

- The pull-request checklist names the feature file to update *and* `.ds/index.md` when a summary
  or file list changes, but not `.ds/files.md`, which a change that adds or moves a file also has
  to touch. Whether the checklist should grow or stay short is an editorial call, not something the
  code decides.
