<div align="center">

# 📐 dspec

### Spec-driven development for AI coding agents — three commands, and a product model that keeps itself true

**Your agent reads what your product is instead of guessing it from the code — and keeps that knowledge up to date on its own.**

[![CI](https://github.com/tuna781/dspec/actions/workflows/ci.yml/badge.svg)](https://github.com/tuna781/dspec/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/tuna781/dspec?label=release&color=blue)](https://github.com/tuna781/dspec/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A5%2020-brightgreen.svg)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/runtime%20dependencies-0-brightgreen.svg)](package.json)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-8A2BE2.svg)](#the-three-commands)
[![Codex](https://img.shields.io/badge/Codex-000000.svg)](#the-three-commands)
[![Cursor](https://img.shields.io/badge/Cursor-1a1a1a.svg)](#the-three-commands)

<br>

<img src="demo.gif" alt="A real Claude Code session: asked to let a customer stack two coupons, dspec finds the product rule that forbids it and lists what is not settled — before any code is written" width="820">

</div>

```
npm i -g dspec                          # once, per machine
dspec init                              # in your repo — pick your agents
/ds-bootstrap                           # inside the agent — builds the product model, once
/ds let customers stack two coupons     # every feature from here on
```

---

## What dspec does

An agent that has to read your codebase to understand it will read the wrong four files sooner or
later, and be confident about it. `CLAUDE.md` is meant to carry that knowledge across sessions —
except nothing checks that a word of it is still true.

dspec gives your agent a **product model**: every feature — what it is, where it lives in the code,
what it depends on, and the rules it must never break. The agent builds it once, reads it before
every change, and **keeps it up to date itself** after every change. You never edit it; you talk to
your agent about features.

- **Discovery gets cheap.** The agent reads the one feature a request touches, not your source tree.
- **Broken rules surface while they are still a sentence.** `/ds` checks what you ask for against the
  product's rules and says *"this contradicts X — you decide"* before any code exists.
- **Guesses are labelled, not smoothed over.** When nothing in the model decides a question, the
  agent says so instead of inventing an answer that sounds right.
- **It stays true.** Every description is fingerprinted against the code it describes. When code
  changes, the agent updates the description before it finishes — enforced by a hook in Claude Code.

Everything is local: no server, no token, no telemetry, zero runtime dependencies — and no network
call, except `dspec update` asking npm for a newer version when you run it.

---

## Contents

- [Install](#install)
- [The three commands](#the-three-commands)
- [Terminal commands](#terminal-commands)
- [Updating](#updating)
- [How the model stays true](#how-the-model-stays-true)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## Install

```
npm i -g dspec
```

Then, in any repository:

```
dspec init
```

It asks which agents to set up and installs the three commands into each, in its own syntax.

```
Which agents should get dspec?

  1. [x] Claude Code
        commands and the three session hooks
  2. [ ] Codex CLI
        commands live in your home directory — not shared when a teammate clones
  3. [x] Cursor
        no session hooks: it cannot run a command on a session event
```

**Requires Node ≥ 20 and git.**

### What it writes

| Agent | Files |
|---|---|
| **Claude Code** | `.claude/commands/ds.md`, `ds-bootstrap.md`, `ds-update.md`; `.claude/hooks/dspec/`; dspec's own entries in `.claude/settings.json` |
| **Codex CLI** | `~/.codex/prompts/ds.md`, `ds-bootstrap.md`, `ds-update.md` |
| **Cursor** | `.agents/skills/ds/`, `ds-bootstrap/`, `ds-update/` |

Every file dspec installs carries a `dspec:managed` mark, and **every `dspec init` deletes all of them
and writes them again** from the version you have — so an upgrade leaves nothing out of date and
nothing a newer version dropped. **A file without the mark is never touched**, even one named
`ds-something`; your own hooks and settings stay exactly as they are.

Commit the Claude Code and Cursor files and a teammate gets the commands on clone. Codex prompts
load only from your home directory, so a teammate using Codex runs `dspec init` themselves. The
product model is committed with your code too — you never need to open it.

---

## The three commands

Typed inside your agent — the same in Claude Code, Codex and Cursor.

| | |
|---|---|
| **`/ds-bootstrap`** | builds the product model the first time; brings it fully up to date every time after |
| **`/ds {what you want}`** | the core: a detailed spec, a build plan, and — once you approve — the build |
| **`/ds-update`** | takes the newest dspec from npm and reinstalls its commands, from inside the session |

### `/ds-bootstrap`

Run once in a repository. The agent reads the code, names the product's features by what they do —
not by folder — writes what each one is for and the rules the product keeps, and tells you what it
found. Run it again any time: it finds everything the model no longer agrees with and fixes it.

```
> /ds-bootstrap

⏺ Product model ready: 14 features — Checkout, Apply discount, Place order, Refunds, …
  Not settled from the code alone: whether partial refunds may exceed the discount.
```

### `/ds {what you want}`

The whole spec-driven loop in one command:

1. **Understands the request** against the features it touches, their rules, and what they depend on.
2. **Describes what you want in detail** — behaviour, edge cases, errors — in your product's own
   words, quoting every rule the request would break and naming everything the model does not
   settle.
3. **Plans the build** — where, the steps, what breaks if it is wrong, which tests.
4. **Stops and waits for your decision.** Nothing is written until you approve.
5. On approval: **builds it, runs the tests, updates the product model**, and tells you which
   features changed.

```
> /ds let a customer stack two coupons

⏺ Conflict: "Only one coupon may be applied to an order." (Apply discount) — one of the two has to
  change; that is your call.
  Not settled: whether stacked coupons apply before or after shipping.
  Plan: …
  Waiting for your decision.
```

`/ds` with nothing after it summarises the product's features and anything outstanding. In a repo
with no model yet, it asks you to run `/ds-bootstrap` first.

### `/ds-update`

Runs `dspec update`, then `dspec init`, and reports what changed. Start a new session afterwards so
the agent reads the new commands.

---

## Terminal commands

Everything the three commands do is an ordinary terminal command the agent runs — so you can run
them yourself, and a CI job can too.

| Command | |
|---|---|
| `dspec update [--check]` | install the latest dspec from npm, if it is newer |
| `dspec init [--agent a,b] [--all] [--yes]` | install the three commands into your agents, rebuilding everything dspec installed before |
| `dspec sync [--write] [--strict] [--json]` | measure the model against the code; `--write` records what is mechanical |
| `dspec accept "<Feature>"…` | record that a feature's description is current for its code |
| `dspec spec "<Feature>" [--touch F]` | what the model knows about a piece of work |

Nothing exits non-zero unless you ask for it. In CI:

```yaml
- run: dspec sync --strict     # fails only when the model and the code measurably disagree
```

Every command works from any subdirectory.

---

## Updating

```
dspec update     # installs the latest dspec from npm, if it is newer
dspec init       # in each repo: rebuild the commands and hooks from it
```

Or, inside the agent, **`/ds-update`** does both. `dspec update` goes through your own `npm`, so your
registry and proxy settings apply. It updates a global install only, into the prefix it runs from —
a dspec in a project's `node_modules` is updated through that project's `package.json`.

Upgrading from `/dspec-*` or `/ds-sync` (0.0.x): `dspec init` removes those and installs `/ds`,
`/ds-bootstrap` and `/ds-update` in their place.

---

## How the model stays true

- **Every description is fingerprinted** against the files it describes. When the code changes, the
  description is flagged as older than its code — never silently assumed current.
- **The agent updates it after every change**, without asking: it reads the changed code and the
  description, rewrites the description, and records that the two agree again. It does the same for
  new code no feature describes yet.
- **In Claude Code this is enforced.** Before the agent ends a turn, a hook checks whether the model
  is behind the code and, if it is, has the agent bring it up to date first — once per turn, never
  in a loop.
- **In Codex and Cursor it is an instruction.** Neither can run a command when a turn ends, so the
  agent is told to do it, and `/ds-bootstrap` catches up anything that was missed.
- **Code that was never described is left to `/ds-bootstrap`**, so an old backlog is not dumped on
  every turn.

---

## Troubleshooting

| Symptom | Usual cause | Fix |
|---|---|---|
| `/ds` does not appear in the agent | that agent was not chosen, or the session predates the install | `dspec init`, then start a new session — Codex only reads `~/.codex/prompts` at start-up |
| `/ds` says there is no product model | the repo has not been bootstrapped | `/ds-bootstrap` |
| a `/ds*` command you edited went back to how it was | `dspec init` rebuilds every file it installed | keep your own commands under another name |
| a teammate has the repo but no `/ds` in **Codex** | Codex prompts live in the home directory | they run `dspec init` on their own machine |
| nothing happens at all — no hooks, no commands | Node is not on the PATH your agent starts processes with | install Node ≥ 20. A version manager (nvm, fnm, asdf) puts it on PATH via a shell startup file, so a spawned process can miss it. `dspec init` records the absolute path as a fallback |
| `dspec init` says `settings.json` is unreadable | your JSON has a syntax error | fix it and re-run — dspec wrote **nothing** to it |
| `dspec update` says it is not a global install | dspec runs from a project's `node_modules` or a checkout | update it there: `npm i -D dspec@latest` |
| `dspec sync --strict` fails in CI | a description is older than its code | run `/ds-bootstrap` in your agent and commit the result |

---

## Contributing

Node **≥ 20**, no runtime dependencies, `npm install && npm run build && npm test`.

Everything else — the rules that are easy to get wrong, where things live, and how a change reaches
users — is in **[CONTRIBUTING.md](CONTRIBUTING.md)**. Bugs go through the
[issue forms](https://github.com/tuna781/dspec/issues/new/choose); questions go to
[Discussions](https://github.com/tuna781/dspec/discussions).

## License

MIT — see [LICENSE](LICENSE). Security policy: [SECURITY.md](SECURITY.md).
