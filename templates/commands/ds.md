---
description: Describe what you want in detail, plan how to build it, and build it once approved
argument-hint: "[what you want to build or change]"
allowed-tools: Bash(dspec spec:*), Bash(dspec sync:*), Bash(dspec accept:*), Read, Grep, Glob, Edit, Write, Bash
---

The request: $ARGUMENTS

This project keeps an internal product model that you maintain. The user never reads or edits it, so
**talk to them about features and behaviour — never about files, frontmatter or anything under
`.ds/`.**

**If there is no request**, run `dspec sync --brief`, then tell the user in a few lines which
features the product has (from `.ds/index.md`) and anything the model says is outstanding. Stop.

**If the repository has no `.ds/` model yet**, tell the user to run `__DS_CMD_BOOTSTRAP__` first,
and stop. Setting a model up reads the whole codebase; it must not happen as a side effect of a
request.

Otherwise, in four parts. **Nothing is written — no code, no model — until the user approves the
plan.**

## 1. Understand the request against what the product already is

1. **Find the feature.** Read `.ds/index.md`, name the feature(s) this touches, and run
   `dspec spec "<that name>"`. Read all of it.
2. **If it says the model does not name this**, its *"Possibly related"* list is a guess with no
   scope. Read the one that looks right, confirm it is the feature, and re-run by name. If none of
   them is, the work is new — say which existing features it sits beside.
3. **Dependencies arrive as contracts** — what each promises and the rules it holds you to. Those
   rules bind this change as much as the feature's own. `--touch "<Feature>"` renders one whole.
4. **If the output opens with a ⚠ Unreliable block**, read the code of those features before
   relying on them; do not fill the gap from naming or convention.

## 2. Describe what the user wants — in detail

Write it for the user to read and correct:

- **What changes**, as behaviour a person would notice: inputs, outcomes, edge cases, errors.
- **In the product's own words** — the names the features and the glossary already use.
- **Every conflict, outright.** If the request contradicts one of the product's rules or a feature's
  rules, quote the rule and say one of the two has to change — **that is the user's call**.
- **What is not settled.** Where nothing in the product decides a question, say *"not settled — you
  decide"* rather than choosing silently.

## 3. Plan the build

- **Where**: the files, staying inside the Code Map `dspec spec` printed. Anything outside it is
  named with the reason.
- **Steps**, in order, small enough to review.
- **What breaks if this is wrong** — the part a list of steps does not show.
- **Tests**: which exist and cover it, which you will add.

## 4. Stop and wait for the user's decision

Show parts 2 and 3 and **stop**. Answer questions and revise until the user approves. When they do
("ok", "build it", "go"):

1. **Build it**, inside the plan. Run the tests and fix what fails.
2. **Bring the model up to date — without asking**, following *Keeping the product model current*
   in `CLAUDE.md` / `AGENTS.md`: `dspec sync`; for every description older than its code, read both,
   update the description, `dspec accept "<Feature>"`; claim new files or add a feature for new
   behaviour (run `dspec sync --guide` before writing under `.ds/`); `dspec sync --write`; finish
   with `dspec sync --strict` clean.
3. **Report**: what was built, the test result, and one line naming the features whose description
   changed.
