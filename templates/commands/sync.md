---
description: Repair the dspec model — add what is missing, patch what is wrong
allowed-tools: Bash(dspec sync:*), Bash(dspec spec:*), Read, Edit, Write, Grep, Glob
---

Bring an existing `.ds/` back into agreement with the code. This **repairs**; it never creates a
model from nothing — `__DS_CMD_BOOTSTRAP__` does that.

Run `dspec sync --write`. It restores base files that have gone missing, re-stamps every feature and
re-renders `.ds/index.md` and `CLAUDE.md`. Everything it cannot decide alone comes back as a list,
and all of it is judgement:

**A description older than its code.** Read both, then ask the user which is wrong. Do **not**
rewrite the description to match the code — the code is the unreviewed party here, and somebody may
not yet have said whether the rule changed with it.

**A file a feature claims that is gone, or an `entry:` that moved.** Find where it went and correct
the `code:` list. If the feature itself no longer exists in the code, say so and ask — **never
delete a feature to make a report go quiet.**

**A feature with no body.** Read its files and write what a read of them would not tell you. If you
cannot say why a branch exists or what must never change, ask rather than paraphrasing the code.

**Code no feature describes.** Reported per directory, and **most of it should stay undescribed** —
a helper module in the model is noise that buries the features that matter. Propose only what a
person would actually name as a feature, and **ask before writing any of them.**

**A `tests:` path that is gone.** Remove it or point it at the test that replaced it. Do not
substitute a test you have not read.

Finish with `dspec sync --strict`: it exits non-zero only on a measured fact, so a clean run means
every path resolves and nothing is older than its code. Never write `stamp` by hand.
