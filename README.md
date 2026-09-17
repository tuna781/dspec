<div align="center">

# 📐 dspec

### Spec-driven development in one command: `/ds {anything}`

**Say what you want. Your agent specs it against what your product already is, plans the build, and waits for your go — then builds it and keeps the product model true on its own.**

[![CI](https://github.com/tuna781/dspec/actions/workflows/ci.yml/badge.svg)](https://github.com/tuna781/dspec/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/tuna781/dspec?label=release&color=blue)](https://github.com/tuna781/dspec/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A5%2020-brightgreen.svg)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/runtime%20dependencies-0-brightgreen.svg)](package.json)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-8A2BE2.svg)](#ds--the-one-command)
[![Codex](https://img.shields.io/badge/Codex-000000.svg)](#ds--the-one-command)
[![Cursor](https://img.shields.io/badge/Cursor-1a1a1a.svg)](#ds--the-one-command)

<br>

<img src="demo.gif" alt="A real Claude Code session: /ds let a customer stack two coupons — the agent finds the product rule the request breaks, lists what is not settled, plans the build and waits for a decision before writing any code" width="820">

</div>

```
npm i -g dspec && dspec init            # once: install, pick your agents
/ds-bootstrap                           # once per repo, inside the agent

/ds let customers stack two coupons     # ← this is dspec. Every feature, every change, from here on.
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
- **One command is the whole loop.** `/ds {anything}` turns a sentence into a detailed spec, a
  build plan, a decision for you, and — once you say go — working code and an up-to-date model.
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
- [`/ds` — the one command](#ds--the-one-command)
- [Supporting commands](#supporting-commands)
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

It asks which agents to set up and installs `/ds` — and its two supporting commands — into each,
in its own syntax.

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

## `/ds` — the one command

**Spec-driven development is one command.** Whatever you want — a feature, a change, a fix — you
type it after `/ds`, in plain words:

```
/ds let a customer stack two coupons
/ds refunds should go back to the original card
/ds why can a cart be checked out twice?
```

Every time, the same loop:

1. **Understand** the request against the features it touches, their rules, and what they depend on.
2. **Spec it in detail** — behaviour, edge cases, errors — in your product's own words, quoting every
   rule the request would break and naming everything the product does not settle yet.
3. **Plan the build** — where, the steps, what breaks if it is wrong, which tests.
4. **Stop and wait for your decision.** Nothing is written — no code, no model — until you approve.
   Ask questions, change the spec, change the plan.
5. **On your go:** build it, run the tests, bring the product model up to date, and tell you which
   features changed.

From the session in the demo above:

```
> /ds let a customer stack two coupons

⚠ Conflict: this breaks a current rule

Apply discount has this rule: "Only one coupon may be applied to an order."
Your request directly contradicts it, so one of them has to give. That's your call. Either:
- (a) change the rule to "At most two coupons may be applied to an order", or
- (b) keep the one-coupon rule and drop the request.

Not settled: you decide
1. How the two discounts combine. …
2. The same code twice. …
5. A gap you already have. The product rule says "Every write is idempotent by request id." …

How I'd build it — Where · Steps · What breaks if this is wrong · Tests

Before I build, tell me: (a) or (b), and your answers to 1–5.
```

`/ds` with nothing after it summarises the product's features and anything outstanding.

---

## Supporting commands

Two more commands exist so that `/ds` always has a product model to work from — you run them rarely.

| | |
|---|---|
| **`/ds-bootstrap`** | **Once per repository.** The agent reads the code, names the product's features by what they do, and writes what each is for and the rules the product keeps. Run it again any time to bring the whole model up to date — `/ds` asks you to, in a repo that has none. |
| **`/ds-update`** | **When a new dspec is out.** Runs `dspec update` and `dspec init` from inside the session; start a new session afterwards. |

---

## Terminal commands

Everything `/ds` and its supporting commands do is an ordinary terminal command the agent runs — so
you can run them yourself, and a CI job can too.

| Command | |
|---|---|
| `dspec update [--check]` | install the latest dspec from npm, if it is newer |
| `dspec init [--agent a,b] [--all] [--yes]` | install `/ds` and its supporting commands into your agents, rebuilding everything dspec installed before |
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
