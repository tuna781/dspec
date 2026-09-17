---
name: Git access
area: Code measurement
code: [src/git/rev.ts]
entry: isGitRepo
stamp: sha256g:2dc98ea1ac213bb3
---

Everything dspec needs from git: whether this is a repository at all, and how to read a model as it
stood at another revision. Kept in one place because two features ask, and two implementations of
"is this a repo" would disagree the day either is touched.

Rules
- **git is a source of facts, never a requirement.** A repository that is not a git checkout still
  loads, still compiles and still reports; only the answers that genuinely need history are absent.
- **Failure is answered, not thrown.** A git command that fails means "this cannot be known here",
  and the caller degrades rather than dying.

Behaviour
- One place spawns the process, so "is this a repo" has one answer and a failure has one meaning.
- A model that has never been committed is not a pending change: git reports an untracked file
  exactly like a modified one, so tracked-ness is the test. Without it, a fresh scaffold opens every
  session by announcing the whole model as outstanding work.
- `changedFiles` lists what is added or modified in the working tree and index — renames by their
  new path, deletions left out, read NUL-separated so a non-ASCII path stays a path. It is how the
  Stop hook tells new undescribed code from a repository's old backlog.
