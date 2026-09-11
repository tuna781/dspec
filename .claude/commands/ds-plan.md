---
description: Describe what you want, plan the implementation, and build it
argument-hint: "[what to build]"
allowed-tools: Bash(dspec spec:*), Bash(dspec sync:*), Read, Edit, Write, Grep, Glob, Bash
---

Everything `/ds-spec` does, and then the plan and the build.

**First, produce the description.** Follow `/ds-spec` exactly — find the feature, read what
it returns, ask about anything the ⚠ block flags, use the model's vocabulary, state every conflict, and
say plainly where the model is silent. Show it to the user and get it agreed before planning
anything. A plan built on a description nobody has corrected is a plan for the wrong thing.

**Then plan.**

1. **Stay inside the Code Map.** It is the feature's own files plus the files of everything it
   declares in `uses:` — a scope the model declared, not one anybody guessed. If the work genuinely
   needs a file outside it, say so in the plan and say why, rather than quietly widening.

2. **Name what breaks if the plan is wrong.** That is the part a reader cannot reconstruct from a
   list of steps, and it is what tells the user whether to approve it.

3. **Say which rules constrain the work** — from `.ds/product.md` and from the features in scope —
   and how the plan respects them.

4. Show the plan to the user and **wait for approval.**

**Then build.** Implement it, staying inside the Code Map. Run the tests.

**Then ask: "Reconcile this into the model?"** If yes, run `/ds-sync`.

> **That last step is the only point in this flow where `.ds/` is written.** Writing a description
> earlier — while planning, or while coding — leaves the model describing behaviour that does not
> exist yet. The model records what the product **is**, never what was proposed.
