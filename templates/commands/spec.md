---
description: Describe in detail what you want to build, checked against the model
argument-hint: "[what you want to build]"
allowed-tools: Bash(dspec spec:*), Read, Grep, Glob
---

Turn $1 into a detailed description of **what the user wants**, checked against what the model
already says — for them to read and correct **before any code exists**.

> **This command writes nothing.** No model file, no code. A description written before the code
> exists leaves the model describing something that is not there; `__DS_CMD_SYNC__` writes `.ds/`,
> after the fact. __DS_FENCE__

1. **Find the feature.** Read `.ds/index.md`, name the feature this touches, and run
   `dspec spec "<that name>"`. Read the whole thing.

2. **If it says the model does not name this**, it offers features under *"Possibly related —
   decide, do not assume"*, then lists every feature. Retrieval resolves names, not words, so a
   first phrasing missing is ordinary and means nothing.
   **Those suggestions are a guess and carry no scope.** Read the one that looks right, satisfy
   yourself it is the feature, and re-run by name — do not plan against a suggestion, and do not
   treat its file list as a code map. If none of them is it, **ask the user where this belongs**
   rather than deciding the work is new.

3. **Dependencies arrive as contracts.** Under *"What it uses"* you get what each one promises and
   the rules it holds you to — not how it works. Those rules bind your change exactly as the
   feature's own do. Need the inside of one? `--touch "<Feature>"` renders it whole.

4. **If it opens with a ⚠ Unreliable block, ask about those features first.** They are
   unwritten, unproven, or older than their code. Do not fill the gap from the code, from naming,
   or from convention — that guess is the thing this whole system exists to prevent.

5. **Write the description in the model's own vocabulary.** Use the names `.ds/glossary.md` and the
   feature files already use; do not invent a second word for something that has one.

6. **State every conflict outright.** If the request contradicts a rule in `.ds/product.md` or in
   the feature's own `Rules`, quote the rule, name where it lives, and say that one of the two has
   to win — **and that this is the user's call, not yours.**

7. **Say what the model does not settle.** Where it is silent, write *"the model does not settle
   this"* rather than filling it in. A description that sounds equally confident everywhere is one
   the user cannot calibrate against.

8. Show it to the user and invite corrections. **Stop there.** When they are happy,
   `__DS_CMD_PLAN__` turns it into a plan and builds it.
