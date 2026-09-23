# The demo recording

`../demo-split.gif` is two real Claude Code sessions, side by side, asked the same question in the
same repository — one with `shop/`'s `.ds/` map committed, one without it.

```bash
cd demo
./record-split.sh      # records both halves into half-without.gif and half-with.gif
./compose-split.sh     # labels them and joins them into ../demo-split.gif
```

Each half is a real session: a real question typed into a real `claude`, answering from whatever it
actually found. Nothing on screen is staged, and neither pane is retimed — they play from their own
first frame. The compositing step only adds the label strip above each pane and puts them next to
each other, so `../demo-split.gif` is an edit of *arrangement*, not of content. **If you change
`shop/`, re-record** rather than touching the gif.

Recording costs two real Claude Code sessions against your own account.

## Why it records outside this repository

Claude Code reads `CLAUDE.md` from every parent directory. A session run in `demo/shop` therefore
inherits dspec's own block from the repository root — and the "without dspec" half stops being a
no-dspec baseline, because the agent is still told to go looking for a map.

So `record-split.sh` stages a throwaway copy at `~/dspec-demo/shop`, records there, and deletes it
afterwards. The staging directory is new on every run, which means the trust prompt always appears
and the tape can answer it at a fixed offset — the recording is deterministic in that respect even
though the session itself is not.

`.rec-env.sh` strips the `CLAUDE_CODE_*` and `VSCODE_*` variables an outer session exports, so the
recorded terminal doesn't carry "Visual Studio Code disconnected" or an inherited-child-session
warning across it.

## What is not reproducible

A real session is not deterministic. Re-recording gives different wording, different files opened
and a different duration, and the two halves will not finish where they finished last time. That is
the trade for showing the actual tool rather than a scripted imitation of it: what you lose is a
frame-for-frame reproduction, what you keep is that every number and every tool call on screen is
one the agent really made.

The figures quoted in the top-level README come from the same question run through `claude -p
--output-format json` in each fixture, which reports token usage and cost directly.

## The fixture

`shop/` is a fixture, not a product: a storefront checkout small enough to read in a few minutes and
realistic enough that "where does this live?" is a genuine question. It carries a real `.ds/` map
and the `CLAUDE.md` block, so it stands for a repository that has run `dspec init` and
`/ds-bootstrap`.

Neither this directory nor the gifs ship to npm; `files` in `package.json` lists what does.
