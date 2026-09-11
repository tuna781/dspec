<div align="center">

# 📐 dspec

### `.ds/` keeps your product, concisely — so describing anything before you build it is cheap

**Spec-driven: a few tokens for a coding agent to read, not a codebase it has to guess from.**

[![CI](https://github.com/tuna781/dspec/actions/workflows/ci.yml/badge.svg)](https://github.com/tuna781/dspec/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/tuna781/dspec?label=release&color=blue)](https://github.com/tuna781/dspec/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A5%2020-brightgreen.svg)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/runtime%20dependencies-0-brightgreen.svg)](package.json)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-8A2BE2.svg)](#commands)
[![Codex](https://img.shields.io/badge/Codex-000000.svg)](#commands)
[![Cursor](https://img.shields.io/badge/Cursor-1a1a1a.svg)](#commands)

<br>

<img src="demo.gif" alt="A real Claude Code session: /ds-spec is asked to let a customer stack two coupons, finds the rule in the model that forbids it, and lists what the model does not settle — without writing any code" width="820">

</div>

```
npm i -g dspec        # once, per machine
dspec init            # in the repo you want modelled — pick your agents
/ds-bootstrap         # then, inside the agent
```

<div align="center"><sub><a href="#install">What <code>dspec init</code> writes, and what it will never touch →</a></sub></div>

---

## What `.ds/` is

An agent that has to read your codebase to understand it will read the wrong four files sooner or
later, and be confident about it. `CLAUDE.md` is supposed to survive that — knowledge carried across
an empty context window — except nothing checks that a word of it is still true. `.ds/` is the folder
that does: **one markdown file per feature**, each one naming the files it lives in and the features
it depends on, each fingerprinted against your checkout so it cannot quietly stop being true — and
the checkout fingerprinted back against the model, so code nobody described shows up too.

It answers three questions, and it is built for nothing else:

| | |
|---|---|
| **What is it?** | a paragraph a person wrote — not a summary of the code |
| **Where is it?** | the exact list of files it lives in |
| **What does it touch?** | the other features it depends on |

A feature file, in full:

```markdown
---
name: Apply discount
area: Checkout
code: [src/billing/discount.ts]
entry: applyDiscount
uses: [Place order]
tests: [test/billing/discount.spec.ts]
stamp: sha256f:2600b7f1a5269ae9    # written by `dspec sync` — never typed
---

Applies a coupon code to an order that has not been paid for yet.

Rules
- Only one coupon may be applied to an order.

Behaviour
- Refuses silently on an order already paid, rather than reversing the charge.
```

That is the whole language — **dspec-lang** — and [§ dspec-lang](#dspec-lang) specifies it.

What you get for it:

- **Discovery gets cheap.** An agent that needs one feature reads `.ds/index.md` plus that one
  file — not your source tree. Reading the model costs a few hundred lines for a hundred-feature
  product; reading the codebase to answer the same question costs a grep-and-guess through however
  many files that touches, paid again on every call.
- **Hallucination gets blocked, not smoothed over.** `code:` and `uses:` are written by a person and
  verified by the tool — nothing is inferred from imports or word overlap. When a request names no
  feature, or a description has gone stale, dspec says so *as a labelled guess or an explicit
  warning* instead of filling the gap with something that sounds right. A confident wrong answer is
  the failure that costs a day rather than a minute.
- **Every feature gets described before it's built.** `/ds-spec` reads the model first and surfaces
  the rule your request would break while it is still a sentence — so specifying happens before the
  code exists, not as documentation written afterwards to match whatever shipped.

dspec is a toolkit; your agent is the brain. Every command either measures something readable from
your checkout or writes something mechanical — none of them decides what a feature is or whether a
description still holds. Those judgements stay yours.

Everything is local: no server, no token, no network call, no telemetry, zero runtime dependencies.

---

## Contents

- [Install](#install)
- [Commands](#commands)
  - [`/ds-bootstrap` — create the model](#ds-bootstrap--create-the-model)
  - [`/ds-spec` — describe it before you build it](#ds-spec--describe-it-before-you-build-it)
  - [The other four](#the-other-four)
  - [Under the commands](#under-the-commands)
- [dspec-lang](#dspec-lang)
  - [The shape of `.ds/`](#the-shape-of-ds)
  - [The feature file](#the-feature-file)
  - [The other three files](#the-other-three-files)
  - [The rules of the language](#the-rules-of-the-language)
- [Keeping it true](#keeping-it-true)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Install

```
npm i -g dspec
```

Then, in any repository:

```
dspec init
```

It asks which agents to set up and writes each one's files in its own syntax. Everything after that
is typed inside the session.

```
Which agents should get the dspec commands?

  1. [x] Claude Code
        commands, skill and the three session hooks
  2. [ ] Codex CLI
        commands live in your home directory — not shared when a teammate clones
  3. [x] Cursor
        no session hooks: it cannot run a command on a session event
```

**Requires Node ≥ 20 and git.**

### What it writes

| Agent | Typed as | Files |
|---|---|---|
| **Claude Code** | `/ds-sync` | `.claude/commands/ds-*.md`, `.claude/skills/ds/`, `.claude/hooks/`, a `hooks` key in `.claude/settings.json` |
| **Codex CLI** | `/ds-sync` | `~/.codex/prompts/ds-*.md` |
| **Cursor** | `/ds-sync` | `.agents/skills/ds-*/SKILL.md` |

**The same four commands, spelled the same way in all three.** Claude Code could have had `/ds-sync`
and deliberately does not: moving between agents should not change what you type.

The Claude Code and Cursor files live in the repo, so **commit them** and a teammate gets the loop
on clone. Codex is the exception — its custom prompts load only from your home directory, so a
teammate has to run `dspec init` themselves.

> [!IMPORTANT]
> **`dspec init` adds what is absent and never touches what is there.** Not a file, not a key, not
> a line. There is no `--force`. That cuts both ways: a command file you already have will **never**
> be replaced by a newer version of itself, so after `npm i -g dspec@latest` you delete the file you
> want refreshed and run `dspec init` again. It says so every time rather than letting you wonder
> why nothing changed.

### What only Claude Code gets

The three session hooks — the briefing when a session opens, the spec surfaced when you edit a file
it describes, the reminder when you leave with the model stale. **No other agent can run a command
on a session event**, so on Codex and Cursor the loop is what you remember to type. `AGENTS.md`
asks them to run `dspec sync --brief` when a session starts, which is an instruction rather than a
guarantee, and dspec says which one you are getting.

### Updating

```
npm i -g dspec@latest
dspec sync --write        # re-render the artifacts
dspec init                # add any command that is new
```

---

## Commands

Four, and there is only one kind. If you cannot name it, it is not a command — its job belongs to a
flag on one you can.

**Every one of them is a terminal command.** A `/ds-*` slash command is prose telling your agent
which `dspec` command to run and what to judge in the output — so you can run any of it yourself,
and so can the agent, with or without the slash commands installed.

| | |
|---|---|
| [`/ds-bootstrap`](#ds-bootstrap--create-the-model) | **create** the model for a repo that has none, and finish it |
| [`/ds-sync`](#the-other-four) | **repair** an existing model — add what is missing, patch what is wrong |
| [`/ds-spec {what you want}`](#ds-spec--describe-it-before-you-build-it) | describe it in detail, checked against the model, before any code |
| [`/ds-plan {what you want}`](#the-other-four) | the same, plus the implementation plan, then build it |

### `/ds-bootstrap` — create the model

Run it once, in a repo that has no `.ds/` yet. It sets the repo up and then **finishes the model**,
which is the part that matters: it does not leave you a folder of placeholders.

```
> /ds-bootstrap

⏺ Bash(dspec bootstrap --here)
  ⎿  ✓ .ds/ — 2 files
     ✓ proposed 2 features from the code here
```

The CLI can see which files exist. It cannot see what they are *for* — so it scaffolds the
structure with **every body empty and every name provisional**, and your agent writes the content:

1. **It proposes one feature per directory of source**, with the file list filled in.
2. **It puts the naming to you.** A directory is an observed fact; a feature is something a person
   would name. If the feature list ends up mirroring your folder tree, the names are wrong — and
   the command is written to say so rather than accept it.
3. **It writes each body from a read of that feature's files** — what a read would *not* tell you:
   why a branch exists, which failure it prevents, what must never change. Each one is proposed to
   you, not written silently.
4. **It stops only when nothing is left unwritten**, verified with `dspec sync --strict`.

> **Why the scaffold is empty on purpose.** An empty body reports as unwritten, which is a worklist.
> A body pre-filled with a transcription of the code reports as *complete* — a lie, and it buries
> the very list that would have told you what still needs writing.

Bootstrap **refuses over a model that already has features**, and points at `/ds-sync` instead.
Scaffolding over curated work buries it, and starting over is an explicit act: remove
`.ds/features/` yourself.

### `/ds-spec` — describe it before you build it

The command that earns its place. Describing a feature in chat gives you a description that may
contradict a decision you made six weeks ago, and you find out after the code is written.
`/ds-spec` reads the model first.

```
> /ds-spec let a customer stack two coupons

⏺ Bash(dspec spec "let a customer stack two coupons")
  ⎿  ## The model does not name this
     ## Possibly related — decide, do not assume
     - Apply discount — shares "coupon" · src/billing/discount.ts

⏺ Bash(dspec spec "Apply discount")
  ⎿  Rules
     - Only one coupon may be applied to an order.

⏺ ⚠ This contradicts a rule you already wrote

     "Only one coupon may be applied to an order"
     Apply discount · src/billing/discount.ts
```

**The conflict surfaces while it is still a sentence, not a branch.** That is the whole point: the
agent asks which rule wins instead of confidently building the wrong thing.

Three things it will not do:

- **It writes nothing.** No model file, no code — it ships without a `Write` tool for that reason.
  A description written before the code exists leaves the model describing something that is not
  there.
- **It does not invent vocabulary.** It uses the names your glossary and feature files already use.
- **It does not fill silence.** Where the model does not settle a point, it says *"the model does
  not settle this"* rather than sounding equally confident everywhere.

It ends with a description for you to correct. When you are happy, `/ds-plan` turns it into a plan
and builds it.

### The other four

**`/ds-sync`** — repair an existing model. Restores base files that went missing, re-stamps every
feature, re-renders the index, and reports what only a person can settle: a description older than
its code, a file that moved, a body nobody wrote, code no feature describes. It **never invents a
feature** — that is bootstrap's job, and the two are different intentions.

**`/ds-plan`** — everything `/ds-spec` does, then the implementation plan, then the build. It stays
inside the Code Map: the feature's own files plus the files of everything it declares in `uses:`.


### Under the commands

The CLI has four verbs — `init`, `bootstrap`, `sync`, `spec` — every one named after something you
already know. **Only `bootstrap` and `sync` write to `.ds/`**, and **nothing exits non-zero unless
you ask for it**:

```yaml
- run: dspec sync --strict     # fails only on a measured fact
```

Three hooks run without being asked — on session start, after an edit, and on stop. They only add
context and can never block a tool call. **Claude Code alone gets them**, because no other agent can
run a command on a session event. The commands are the same everywhere; the automatic half is not,
and dspec tells you which one you are getting rather than implying you have both.

Every command works from any subdirectory — the repo root is the nearest ancestor holding `.ds/`.

---

# dspec-lang

Everything under `.ds/` is written in it. This is the whole language.

## The shape of `.ds/`

```
.ds/
  product.md          what this product is, and the rules every change must respect
  glossary.md         what the words mean
  index.md            GENERATED. Every feature, one line. The entry point.
  features/*.md       one file per feature — the only prose anyone writes
```

Four file kinds. Only `features/*.md` is written by hand; `index.md` is rendered from them.

**The directory carries no meaning.** Subfolders under `features/` are allowed for human convenience
and **ignored** by the loader. A feature's grouping comes from its `area:` field, never from its
path. Move a file, rename a folder, reorganise the tree — the model does not change.

This is deliberate. A layout that carries meaning forces a filing decision before anything can be
written, and every filing decision is one a feature can outgrow. A feature spanning three
directories of source has no natural home on disk; it has one perfectly good `area:`.

## The feature file

### Frontmatter — seven keys, three required

| Key | Required | Written by | Meaning |
|---|---|---|---|
| `name` | ✅ | you | how this feature is addressed. Unique — `uses` resolves against it. |
| `area` | ✅ | you | a label that groups the index. Free text, **not** a boundary. |
| `code` | ✅ | you | **every file this feature lives in**, repo-relative |
| `entry` | | you | where to start reading — a symbol declared in one of the `code` files |
| `uses` | | you | the features this one depends on, by name. **The only edges in the model.** |
| `tests` | | you | tests you have actually read that prove what this file describes |
| `stamp` | | **the CLI** | fingerprint of the `code` files. Written by `dspec sync` — never type it. |

Nothing else. No bounded contexts, no entities, no flows, no `kind`, no `actors`.

### Body — a lead paragraph and two labels

```
<lead paragraph>     what this is, in product terms. No label.
Rules                invariants that must hold — what a change must not break, and why.
Behaviour            what it does, and the cases that matter: order, precedence, refusals.
```

A label is a **bare line of text**, not a heading — though `## Rules` is accepted, and so is
`Rules:`. Text before the first label is the lead paragraph, and **it is what the index prints**, so
it must carry the words somebody would look this feature up by.

> **The filter that decides what goes in: if one read of the files in `code` would tell you, it is
> not worth a line.** Write what that read would **not** tell you — why a branch exists, which
> failure it prevents, what must never change.

A description that restates the signature is worse than none: it costs tokens on every agent call
and it goes stale on the next refactor.

## The other three files

**`product.md`** — vision plus the non-negotiable rules that outlive every feature. It is prepended
to every answer the model gives, so it stays short.

**`glossary.md`** — what a word means *here*. When two areas use one word differently, say both.

**`index.md`** — generated by `dspec sync` and committed, so opening `.ds/` answers *what* and *where*
for the entire product in one read:

```markdown
## Checkout
- **Apply discount** — Applies a coupon code to an order that has not been paid for yet
  → `src/billing/discount.ts` · uses: Place order
```

`CLAUDE.md` at your repo root — and `AGENTS.md`, which Codex and Cursor read — is **not** a copy of
the model. It is a pointer at `.ds/index.md` plus your product rules, so it does not grow as the
model does. `AGENTS.md` carries one extra paragraph asking the agent to run `dspec sync --brief`
when a session opens, because it has no hook to do that for it.

## The rules of the language

1. **Declared, not inferred.** `code` and `uses` are written by a person and verified by the tool.
   A tool that guesses a file list will one day omit the file that mattered — and present the
   omission as scope.
2. **The tool writes exactly one field.** `stamp`, and nothing else. `dspec sync` re-measures; only a
   person may re-decide.
3. **Never invent evidence.** `tests` lists tests you have actually read. Guessing `discount.ts` →
   `discount.spec.ts` turns *"nobody proved this"* into *"this is proven"* — the dangerous
   direction, and it fails silently.
4. **`.ds/` describes what exists.** It is written after the code, never before.
5. **Never delete a feature to make a report go quiet.** A feature whose code is gone is reported,
   for a person to decide about.
6. **One feature, one file, one name.** The name is the address.

---

## Keeping it true

### Looking a feature up is a lookup, not a search

`dspec spec` resolves a **name** — an exact match, or a feature's whole name occurring in your request
— and **only a name can produce a Code Map.**

Requests rarely arrive that way. A PR title, a failing command, a review comment: none of them carry
a feature's name. So when nothing resolves, the pack offers a ranked guess *and says it is one*:

```
## The model does not name this

**No feature matches this request by name**, so there is no Code Map below and nothing here
is scope.

## Possibly related — decide, do not assume

_Ranked by words these features share with your request. **A shared word is a coincidence
until you have judged it**, so none of this is a code map and none of it is scope._

- **Apply discount** — Applies a coupon code to an order that has not been paid for yet
  shares "coupon" · `src/billing/discount.ts`
```

**The rule is about placement, not scoring.** Word overlap is only dangerous when it is allowed to
speak with authority, so it is never given any: a guess is printed under a heading calling it a
guess, with the words it matched, outside any code map, above the complete list of every feature.
Matching by word overlap *and asserting the result as scope* once returned an unrelated helper as
the code map and told the agent everything else was unaffected — **a false scope asserted as
authority is the worst thing this tool could do**, and it remains impossible.

### An explicit admission of what the model does not settle

A ⚠ block names every feature in scope that is unwritten or older than its code:

```
## ⚠ Unreliable in this task

**Ask before inferring their behaviour. Do not fill the gaps from the code, from naming,
or from convention — that guess is exactly what this document exists to prevent.**

_These warnings reflect the last scan. The absence of a warning is not evidence that a
description is current._
```

### Reconciliation runs in both directions

`dspec sync --write` reports:

- **model → code** — a description naming files that moved, vanished or changed
- **code → model** — source files nothing in the model describes
- **quality** — features with no body, artifacts that have fallen behind

The second half is what makes a code-first loop possible at all: without it, nothing could ever
notice what you had just built. It counts **files**, not symbols, so the answer is short enough to
act on — and it says *decide*, never *add*:

```
Code no feature describes — 3 files in 1 directory:
  src/billing  3/8
    coupon.ts, refund.ts, ledger.ts

  Decide which of these are real features worth describing — most are not.
```

**`--write` only re-measures.** It restores what is missing, writes stamps and re-renders artifacts.
It never rewrites a description and never deletes a feature: a description the code has overtaken is
where **the code is the unreviewed party**, and rewriting it would discard a decision somebody made.

### The fingerprint

`stamp` is a sha256 over `path:hash` lines for every file in `code`, sorted by path, each file
normalised: line endings, comments, trailing whitespace, blank lines and indentation *width*
removed; indentation *structure* and in-line spacing kept. **Running a formatter is not drift.**

Three states, and the middle one is the point:

- **measured and matching** — as true as it was when written
- **not measured** — no stamp, or one from an older dspec. *Nothing is known.* Never reported as fine.
- **stale** — the code changed after the description was written. Reported, never auto-fixed.

A feature with **no body is never stamped**: a stamp asserts a description is current, and one that
says nothing cannot be.

### The six lint rules

`dspec sync` reports them all; `--strict` is what turns the errors into an exit code.

| Code | Level | Fires when |
|---|---|---|
| `duplicate_name` | error | two features share a `name` — the address is ambiguous |
| `missing_code` | error | a `code` path is not on disk, or `entry` is declared in none of them |
| `unresolved_use` | error | a `uses` entry names no feature |
| `missing_test` | warn | a `tests` path no longer exists — the evidence is gone |
| `no_body` | warn | a feature with no lead paragraph — nothing states what it is |
| `unclaimed_code` | info | a tracked source file no feature claims |

Note what is checked and what is not. A typo in `uses` **silently costs an edge**, so it is an
error. A typo in `area` costs a heading in the index, where you see it immediately — so it needs no
rule. **Check the failures that hide; leave the ones that show.**

Code without a description never fails the build: a gate that reddens on every new file teaches
people to route around it rather than write the description.

---

## Troubleshooting

| Symptom | Usual cause | Fix |
|---|---|---|
| `/ds-sync` does not appear in the agent | that agent was not chosen, or the session predates the install | `dspec init`, then restart the session — Codex in particular only reads `~/.codex/prompts` at start-up |
| `dspec init` reports everything **left alone** and nothing changes | the files are already there, and it never overwrites | delete the file you want refreshed, then run it again |
| a teammate has the repo but no `/ds-*` in **Codex** | Codex prompts live in the home directory, not the repo | they run `dspec init` on their own machine |
| Nothing happens at all — no hooks, no commands | Node is not on the PATH your agent starts processes with | install Node ≥ 20. A version manager (nvm, fnm, asdf) puts it on PATH via a shell startup file, so a spawned process can miss it even though your terminal finds it. `dspec init` records the absolute path in `.ds/config.json` as a fallback |
| `dspec init` says `settings.json` is unreadable | your JSON has a syntax error | fix it and re-run — dspec wrote **nothing** to it, so the hooks are not wired yet |
| the hooks are not wired, but everything else installed | you already had a `hooks` key, and yours wins | merge the block from `dspec init`'s output into it by hand |
| `dspec spec` says the model does not name my request | retrieval resolves names, not words | pick from the ranked suggestions it printed, or `--touch "<Feature>"` |
| `dspec sync` says there is no model | nothing to repair yet | run `/ds-bootstrap` — creating and repairing are different commands |
| `dspec sync --strict` fails right after `--write` | two features share a name | it reports `duplicate_name` — rename one |

**Known limit:** a stamp covers a feature's whole file set, so editing a file two features share
marks both stale. Re-stamping is one command, and the loop already ends in `sync`.

---

## Contributing

Node **≥ 20**, no runtime dependencies, `npm install && npm run build && npm test`.

Everything else — the three rules that are easy to get wrong, where things live, and how a change
reaches users — is in **[CONTRIBUTING.md](CONTRIBUTING.md)**. Bugs go through the
[issue forms](https://github.com/tuna781/dspec/issues/new/choose); questions go to
[Discussions](https://github.com/tuna781/dspec/discussions).

## License

MIT — see [LICENSE](LICENSE). Security policy: [SECURITY.md](SECURITY.md).
