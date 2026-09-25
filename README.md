<h1 align="center">dspec</h1>

<p align="center">
  <strong>Your agent knows your codebase like someone who has worked on it for years.</strong>
</p>

<p align="center">
  Name a feature any way you like — its name, an error it throws, a route, the word your team uses
  for it —<br>and your agent knows which feature you mean, where it lives, and what it does.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/dspec"><img src="https://img.shields.io/npm/v/dspec.svg" alt="npm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/npm/l/dspec.svg" alt="MIT"></a>
  <img src="https://img.shields.io/badge/dependencies-0-brightgreen" alt="zero dependencies">
  <img src="https://img.shields.io/badge/network%20calls-0-brightgreen" alt="no network">
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

Every AI coding agent starts every session as a stranger to your codebase.

It doesn't know what your product's features are, what anybody calls them, or where they live. So
when you ask about one, it searches — and a search matches **words**, not **meaning**. Every file
that mentions the word comes back, and nothing says which one *is* the feature. The agent picks,
reads, and assembles an answer out of whatever happened to share a word with your question.

Then it answers in the same confident voice whether a sentence came from the code that implements
the feature or from a file that only mentioned it. That is where an agent goes wrong: it loses the
context it never had, fills the gap with something plausible, and works on the part of the code
that matched rather than the part that matters.

`CLAUDE.md` was supposed to carry that knowledge from one session to the next. It rarely does:
someone writes it once, the code moves on, and nothing tells you it's now wrong.

## The idea

Think of the developer who has been on a codebase for years. Mention "the second coupon bug", paste
an error, or name a route, and they don't search. They already know:

- **which feature you mean**, whatever you called it;
- **where it lives** — the files, and where to start reading;
- **what it does** — the cases that matter, and the rules it must not break;
- **what it touches** — the features it depends on, and the ones that depend on it.

dspec writes that knowledge down, in your repository, for your agent. It is a map of the codebase
organised the way that developer thinks — by feature, not by folder — and it is the first thing
your agent reads, so it starts every session knowing where things are instead of searching for
them.

## The map

`/ds-bootstrap` has your agent read the codebase **once** — or, in a large one, a part at a time —
and write down what it found:

```
.ds/
  index.md         every feature: what it is, where it starts, what it depends on
  features/*.md    one file per feature — what it does, where it lives, the rules it enforces,
                   and every way somebody might refer to it
  product.md       what the product is, the rules that apply everywhere, and its vocabulary
```

`dspec init` adds a short instruction block to `CLAUDE.md` / `AGENTS.md` — the file your agent
already reads at the start of every session — telling it to use that map first.

**A feature is something a person would name**: a capability of your product, or a piece of how the
repository is built and shipped. Not a directory, not a class, not a layer.

**Every feature knows its names.** People don't ask about features by their proper names. They paste
an error, quote a route, or use the word the team has always used. So each feature records the ways
it gets referred to — its routes, its error codes and messages, the labels users see, its events,
tables and config keys — and the words *you* use for it, once your agent has confirmed in the code
what you meant. A question is looked up in the map, not in the repository, so a message that
happens to contain a common word leads to the one feature that produces it, not to every file that
spells the word.

**Every feature knows its files**, so the lookup works the other way too: start from a file, and the
map names the feature it belongs to — and the rules it must not break.

## What your agent does with it

Answering is the first use, not the only one. The same instruction block tells your agent to
reach for the map whenever it is about to act on your code:

- **It knows what you mean.** Whatever you call a feature — its name, an error, a route, your
  team's word — it looks the words up in the map and lands on the feature they belong to.
- **It answers from the feature**, not from every file that happens to share a word with your
  question.
- **It plans with the blast radius in view.** Before proposing a change it names the features the
  change touches and the ones that depend on them, and carries their rules into the plan — so the
  constraint turns up in the plan, not in a failing test or a reviewer's comment.
- **It knows what a change must not break.** Before it edits a file it looks up the feature that
  owns it and reads the rules that feature's code enforces — and after the edit, it updates that
  feature so the next session reads what the code now does.
- **It reviews a diff by feature.** Changed files are looked up to the features they belong to,
  and those features' rules are what the diff is checked against.

None of this is a command or a step you take. It is what an agent does when the file it reads at
the start of every session tells it where the knowledge is.

## Why you can believe the answer

A map that guesses is worse than no map, because every later session will trust it. So the
instructions dspec installs are built to stop that happening, in four specific ways.

**Nothing is claimed from a name.** Where a feature lives and what it depends on are recorded from
reading the files — never inferred from an import list, a directory name, or a word two files
happen to share. The kind of connection a grep would have offered is exactly the kind that isn't
allowed in.

**Nothing is described unread.** Every sentence in the map is something the agent read in the
code — never what it expects the code to do, and never why somebody might have written it that way:

> **Never describe what you did not read.**

That is the one failure that compounds: a confident sentence about code nobody read gets inherited
by every session afterwards, each one equally sure.

**The map checks itself.** Once written, every path is verified to exist, every dependency to name
a feature that exists, every name it points you at to still be findable, every way of referring to
a feature to belong to that feature alone, and no file of consequence to be left unclaimed — anything unclaimed is either misfiled or a feature that was missed. A map
of a large repository that is still being built says which parts it doesn't cover yet, so an
absence in it is never mistaken for an answer.

**The code always wins.**

> **If `.ds/` and the code disagree, the code wins.**

Your agent updates the feature file for whatever it just changed, as part of the work, not as a
ceremony afterwards. After a big refactor — or a stretch of work by someone who wasn't using this
— `/ds-bootstrap` rebuilds the whole thing. And because `.ds/` is plain markdown committed to your
repo, a wrong belief surfaces in code review like anything else, before it becomes the thing every
future session is certain about.

## One person sets it up; the team gets it

`.ds/` and the instruction block are committed, like any other file. So the developer who runs
`/ds-bootstrap` isn't the one who benefits from it — everyone who pulls does, in their very next
session, without installing anything or being told.

That's also how the map stays honest across a team. Nobody has to remember to update it: whoever
touches the code has an agent that was already told to fix the feature file it just invalidated.

## dspec is not a workflow

No spec to write. No plan to approve. No gate to pass. No process to adopt.

dspec doesn't change how you work — it makes your agent better informed at whatever you already
do. `.ds/` is just knowledge: what each feature is, what people call it, and where it lives.

It sits between the tools you may already use rather than replacing any of them. Search and
indexing tools find **where** code is. Spec tools agree **what to change next**. dspec is what a
long-time developer knows: **what the code already is, what each part of it is called, where it
lives, and what a change must not break** — the part neither of the others keeps, and the part
both of them work better with.

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

Want fewer? `dspec init --agent claude` installs only that one. Anything you leave out is left
exactly as it is — `--agent` adds, it never uninstalls.

**A large repository, or a monorepo?** Map it a part at a time: `/ds-bootstrap services/billing`,
then the next app or service in another session. Each run writes as it reads, so one that stops
half way leaves a map that is true as far as it goes. Until every part is done, the map names the
parts it doesn't cover yet, and your agent searches those as it always did.

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

## Feedback wanted

dspec rests on one bet: the map is prose an agent writes about its own repository, and no schema
and no fingerprint validate it. There is one check, and it is deliberately cheap — a feature points
you at a name and not just at a file, so a name that stops being findable says the code moved under
the description. It tells you where to read, never what is now wrong. The rest is held up by *the
code wins* and *nothing is described unread*.

If you think that isn't enough, that's the conversation I want:
[**is a map an agent writes about its own repo trustworthy?**](https://github.com/tuna781/dspec/discussions/14)
Disagreement is more useful here than agreement.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The whole program is about a thousand lines, and it does
one thing.

## License

MIT
