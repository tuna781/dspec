---
description: Create or repair the dspec model — add what is missing, patch what is wrong
allowed-tools: Bash(dspec sync:*), Bash(dspec spec:*), Read, Edit, Write, Grep, Glob
---

Bring `.ds/` into agreement with the code. The same command whether there is nothing there yet or
years of drift — `dspec sync --write` tells you which by what it does.

**If this repository has no `.ds/` yet**, `dspec sync --write` creates it: `product.md`,
`glossary.md`, and one PROVISIONAL feature per directory of source, every name a guess and every
body empty. Then:

1. **Turn the proposals into features, and put the naming to the user.** A directory is an observed
   fact; a feature is something a person would name. Read enough of the code to say which proposals
   should merge, split or be renamed, then ask. **The answer is theirs, not yours.** If the feature
   list ends up mirroring the directory tree, the names are wrong.

2. **Fix every `code:` list** as you rename. Each feature claims every file it lives in, and a file
   claimed by nobody is reported the next time you run this.

3. **Write the bodies, in small batches, worst-first.** For each feature, read its files and write
   what a read of them would **not** tell you: why a branch exists, which failure it prevents, what
   must never change. If all you can say is what the signature already says, you have not read
   enough yet — or the feature is not a feature.
   Fill `uses:` from what you actually saw, and `tests:` only for tests you have read.
   **Propose each body to the user rather than writing prose silently.**

4. **`dspec sync --write`** again, then `dspec sync --strict` to confirm nothing measurable is
   wrong. Repeat 3–4 until nothing is left unwritten.

__DS_LANG_LINE__

**If `.ds/` already exists**, `dspec sync --write` repairs it instead: restores any base file that
has gone missing, re-stamps every feature and re-renders `.ds/index.md` and `CLAUDE.md`.
Everything it cannot decide alone comes back as a list, and all of it is judgement:

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
every path resolves and nothing is older than its code. Never write `stamp` yourself — the CLI
computes it. Never add a `tests:` entry for a test you have not read: guessing that `place.ts` is
proven by `place.spec.ts` turns *"nobody proved this"* into *"this is proven"*, and it fails
silently.
