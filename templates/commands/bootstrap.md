---
description: Create the dspec model for this repository, complete
allowed-tools: Bash(dspec bootstrap:*), Bash(dspec sync:*), Read, Edit, Write, Grep, Glob
---

Create `.ds/` for this repository and **finish it** — this command ends with a model somebody
could read to understand the product, not with a folder of placeholders.

The CLI can see which files exist. It cannot see what they are *for*. So it scaffolds the
structure and **you write the content**, because you are the one who can read the code.

1. **`dspec bootstrap --here`.** It writes `.ds/` and proposes one feature per directory of
   source — every name provisional, every body empty. If it says features already exist, this
   repo has a model — use `__DS_CMD_SYNC__` instead.

2. **Turn the proposals into features, and put the naming to the user.** A directory is an observed
   fact; a feature is something a person would name. Read enough of the code to say which proposals
   should merge, split or be renamed, then ask. **The answer is theirs, not yours.** If the feature
   list ends up mirroring the directory tree, the names are wrong.

3. **Fix every `code:` list** as you rename. Each feature claims every file it lives in, and a file
   claimed by nobody is reported. `dspec sync` verifies every path.

4. **Write the bodies, in small batches, worst-first.** For each feature, read its files and write
   what a read of them would **not** tell you: why a branch exists, which failure it prevents, what
   must never change. If all you can say is what the signature already says, you have not read
   enough yet — or the feature is not a feature.
   Fill `uses:` from what you actually saw, and `tests:` only for tests you have read.
   **Propose each body to the user rather than writing prose silently.**

5. **`dspec sync --write`**, then `dspec sync --strict` to confirm nothing measurable is wrong.
   Repeat 4–5 until nothing is left unwritten.

__DS_LANG_LINE__

Never write `stamp` yourself — the CLI computes it. Never add a `tests:` entry for a test you have
not read: guessing that `place.ts` is proven by `place.spec.ts` turns *"nobody proved this"* into
*"this is proven"*, and it fails silently.
