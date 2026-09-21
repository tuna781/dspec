---
name: Demo recording
area: Demo
kind: repo
code:
  - demo/README.md
  - demo/record-split.sh
  - demo/compose-split.sh
  - demo/make-labels.py
  - demo/.rec-env.sh
  - demo/half-without.tape
  - demo/half-with.tape
  - demo/demo.tape
  - demo-split.gif
uses: [Demo fixture]
---

Produces the recording at the top of the README: two real Claude Code sessions, side by side, asked
the same question in the same repository — one with a `.ds/` map committed and one without. It
exists because the claim dspec makes is comparative, and the only honest way to show a comparison
is to run both sides for real. Start at `demo/README.md`, then `record-split.sh`.

## Rules

- **Both halves are real sessions.** A scripted imitation of an agent would be cheaper to record and
  worthless as evidence: the numbers on screen have to be ones the agent actually produced, or the
  recording is an advertisement rather than a demonstration.
- **The "without" half must not be able to see a map.** Claude Code reads `CLAUDE.md` from every
  parent directory, so a session recorded inside this repository inherits dspec's own block and
  goes looking for `.ds/` anyway. Recording happens in a staging copy outside the repository for
  that reason alone, and moving it back inside would silently destroy the comparison while still
  producing a plausible-looking gif.
- **Compositing may arrange, never alter.** The join adds a label strip and places the two panes
  next to each other. Neither pane is retimed, cut into, or sped up.
- **The fixture is shared with the reader.** `shop/` is committed, map and block included, so
  anybody can run the same question and get their own numbers.
- **Re-recording is not reproducible, and the README says so.** A real session gives different
  wording, different files and a different duration every time.

## Behaviour

- `record-split.sh` stages a throwaway copy at `~/dspec-demo/shop` — source only for the "without"
  half, source plus `.ds/` and `CLAUDE.md` for the "with" half — records it, and deletes the stage
  on exit through a trap, so an interrupted run leaves nothing behind. `./record-split.sh with`
  records one half alone.
- Because the stage is new on every run, the trust prompt always appears, which is what lets the
  tape answer it at a fixed offset. A recording into a directory already trusted would send those
  keystrokes into the prompt box instead.
- `.rec-env.sh` unsets the `CLAUDE_CODE_*` and `VSCODE_*` variables an outer session exports.
  Without it the recorded terminal carries a "Visual Studio Code disconnected" line and an
  inherited-child-session warning, both artifacts of recording from inside another session.
- `compose-split.sh` renders the two label strips, stacks each above its pane, joins them with a
  divider, and writes `demo-split.gif` at 8fps and a 64-colour palette — the settings that keep a
  48-second two-pane recording small enough to sit at the top of a README. Both panes are trimmed
  to the same 48 seconds, which is the one place the two runs are made comparable in length.
- It needs tools that are nobody's dependency and are not declared anywhere: `vhs` for the tapes,
  `ffmpeg` for the join, and Python with Pillow for the labels — which loads Arial from
  `/System/Library/Fonts`, so producing the gif is in practice a macOS job.
- Only the composite is committed. The two halves and the label strips are build output and are
  ignored.
- The figures in the README's table come from the same question put through
  `claude -p --output-format json` in each fixture, which reports tokens and cost directly — not
  from reading them off these frames.
- The recorded "with" half goes `index.md` → one feature file, so a change that moved the index's
  entry file or renamed the first read would date the gif.

## Decisions

- **The trade in favour of real sessions is stated in the README rather than hidden.** What is lost
  is a frame-for-frame reproduction; what is kept is that every tool call on screen is one the
  agent really made.

## Unsettled

- `demo.tape` is the superseded single-pane recording. It still runs and writes `../demo.gif`, a
  file nothing commits and nothing links to, since the README shows the split version. Whether it
  is kept as a fallback or deleted is not decided anywhere in the code.
