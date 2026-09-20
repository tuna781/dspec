<h1 align="center">dspec</h1>

<p align="center">
  <strong>Stop paying your agent to re-read your product every single session.</strong>
</p>

<p align="center">
  Write it down once in <code>.ds/</code> — a form built to be read fast:<br>
  one page to find the feature, one file to understand it.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/dspec"><img src="https://img.shields.io/npm/v/dspec.svg" alt="npm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/npm/l/dspec.svg" alt="MIT"></a>
  <img src="https://img.shields.io/badge/dependencies-0-brightgreen" alt="zero dependencies">
  <img src="https://img.shields.io/badge/network%20calls-0-brightgreen" alt="no network">
</p>

<p align="center">
  <img src="demo.gif" alt="One question about a product: 12 of 15 files to grep without dspec; two reads with it" width="100%">
</p>

```bash
npm i -g dspec
dspec init
```

Then, in Claude Code, Codex or Cursor:

```
/ds-bootstrap
```

That's it. That's the whole tool.

---

## The problem

You ask your agent a question about your own code. It has no idea what your product is, so it goes
looking for one:

```
Grep "discount"            → 47 hits across 23 files
Glob "src/**/*.ts"         → 312 files
Read src/checkout/index.ts
Read src/checkout/cart.ts
Read src/pricing/rules.ts
Read 6 more files…
```

Tens of thousands of tokens, half a minute of waiting, and the answer still comes back with a
guess in it. **Then you open a new session and pay for all of it again.** And in the session after
that. And for everyone else on the team, in every session of theirs.

`CLAUDE.md` was supposed to fix this. It usually doesn't: someone writes it once, the code moves
on, and nothing tells you it's now wrong.

## What dspec does

`/ds-bootstrap` reads your codebase **once** and writes down what it found:

```
.ds/
  index.md         every feature: what it is, which files it lives in, what it depends on
  features/*.md    one file per feature — what it does, and why
  product.md       what the product is, and the rules that apply everywhere
```

`dspec init` adds a short instruction block to `CLAUDE.md` / `AGENTS.md` — the file your agent
already reads at the start of every session — telling it to use that map first.

Now the same question goes:

```
Read .ds/index.md                     → "Apply discount" lives in src/pricing/discount.ts
Read .ds/features/apply-discount.md   → what it does, and why it refuses a second code
Read src/pricing/discount.ts          → the actual code
```

Three reads. No search. And the feature file already explains the *why*, which no amount of
reading the code would have told it.

## Why it's cheaper

The map is written once and read many times. A feature file is a few hundred tokens; the search it
replaces is tens of thousands — on every question, in every new session, for every person on your
team.

It's also more **accurate**. A grep finds files that mention a word. The map says which files a
feature actually lives in, because an agent read them and wrote it down.

## dspec is not a workflow

No spec to write. No plan to approve. No gate to pass. No process to adopt.

dspec doesn't change how you work — it makes your agent faster and cheaper at whatever you already
do. `.ds/` is just knowledge: where things are, and why.

## The two surfaces

| Where | What |
|---|---|
| **Terminal** | `dspec init` — installs the command into every agent it supports, and writes the instruction block |
| **Your agent** | `/ds-bootstrap` — builds the map, or brings it up to date |

**It asks nothing.** One `dspec init` sets up all three:

| Agent | Command lands at | Reads |
|---|---|---|
| Claude Code | `.claude/commands/ds-bootstrap.md` | `CLAUDE.md` |
| Codex CLI | `~/.codex/prompts/ds-bootstrap.md` | `AGENTS.md` |
| Cursor | `.agents/skills/ds-bootstrap/SKILL.md` | `AGENTS.md` |

Installing an agent you never open costs you one markdown file. *Not* installing the one you do
open costs you a session where `/ds-bootstrap` isn't there and nothing says why — so dspec makes
the cheap mistake, and you don't have to predict which agent you or a teammate will reach for.

Codex only reads prompts from your home directory, so its command isn't shared when a teammate
clones the repo — they run `dspec init` once themselves.

Want fewer? `dspec init --agent claude` installs only that one, and uninstalls any other that
keeps its files in this repository.

## Keeping the map true

A map that lies is worse than no map. So the instruction block is blunt about it:

> **If `.ds/` and the code disagree, the code wins.**

Your agent updates the feature file for whatever it just changed, as part of the work. After a big
refactor — or a stretch of work by someone who wasn't using this — `/ds-bootstrap` rebuilds the
whole thing.

Because `.ds/` is plain markdown committed to your repo, drift shows up in code review like
anything else.

## What it won't do

- **Call the network.** Ever. No server, no account, no token, no telemetry, not even a version
  check. Upgrading is `npm`'s job.
- **Install dependencies.** Node 20+, and nothing else.
- **Touch a file it didn't write.** Every file dspec installs is marked; `dspec init` deletes only
  marked files before writing them again. In `CLAUDE.md` / `AGENTS.md` it owns only the block
  between `<!-- ds:begin -->` and `<!-- ds:end -->` — every other byte is yours.
- **Read your codebase.** `dspec init` installs files and nothing more. Deciding what your features
  are takes judgement, and that's your agent's job, not a CLI's.

## Upgrading

```bash
npm i -g dspec@latest
dspec init          # rebuilds what dspec installed, from the new version
```

Start a new agent session afterwards so it picks up the rebuilt command.

<details>
<summary><strong>Coming from 0.1.x?</strong></summary>

0.2.0 removed everything that made dspec a workflow: the `/ds` and `/ds-update` commands, the
session hooks, and the `dspec sync | spec | accept | update` verbs, along with code fingerprints,
drift detection and the linter.

One `dspec init` removes every trace of them, including the hook entries the old version left in
`.claude/settings.json`. Your existing `.ds/` still reads fine — run `/ds-bootstrap` when
convenient to bring it to the simpler format. Full detail in the [changelog](CHANGELOG.md).

</details>

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The whole program is about a thousand lines, and it does
one thing.

## License

MIT
