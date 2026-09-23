# dspec — demo recording
#
# Re-record with:  cd demo && vhs demo.tape
#
# Every command here is real and runs against ./shop, a small demo codebase carrying a real .ds/
# map. The numbers on screen are whatever grep actually returns — nothing is staged. If the demo
# codebase changes, re-run the tape rather than editing the gif.

Output ../demo.gif

Set Shell "bash"
Set FontSize 18
Set Width 1280
Set Height 390
Set Padding 22
Set Theme "Catppuccin Mocha"
Set TypingSpeed 12ms

Hide
Type "cd shop && clear && export PS1='$ '" Enter
Show

Sleep 400ms
Type "# when does checkout refuse a second discount code?" Enter
Sleep 1500ms
Type "" Enter

Type "# Your agent does not know where that lives. It goes looking." Enter
Sleep 500ms
Type "grep -rli discount src/ | wc -l    # files it has to open" Enter
Sleep 1200ms
Type "find src -name '*.ts' | wc -l      # out of this many" Enter
Sleep 1600ms
Type "" Enter
Type "# 12 of 15 files. Tens of thousands of tokens." Enter
Sleep 500ms
Type "# Every one mentions the word. Two of them are the feature." Enter
Sleep 1800ms
Type "clear" Enter
Sleep 400ms

Type "# With dspec, the map answers it. Start at the index:" Enter
Sleep 400ms
Type "grep -A2 -F '**Apply discount**' .ds/index.md" Enter
Sleep 2600ms
Type "" Enter
Type "# One feature, two files. Now read that feature:" Enter
Sleep 600ms
Type "sed -n '15,21p' .ds/features/apply-discount.md" Enter
Sleep 4200ms
Type "clear" Enter
Sleep 300ms

Type "# Two reads. No search. The answer, from the feature itself." Enter
Sleep 1300ms
Type "" Enter
Type "# Get it:" Enter
Type "#   npm i -g dspec" Enter
Type "#   dspec init" Enter
Type "#   /ds-bootstrap      <- in Claude Code, Codex or Cursor" Enter
Sleep 2800ms
