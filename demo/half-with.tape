# dspec demo — the "with dspec" pane. A real Claude Code session, asked a real question.
# Driven by ../record-split.sh, which stages ~/dspec-demo/shop with or without the map.
# The trust prompt is answered off-camera; the staging directory is new every run, so it
# always appears and the tape is deterministic.

Output "half-with.gif"

Set Shell "bash"
Set Width 1000
Set Height 700
Set FontSize 14
Set Padding 18
Set Theme "Catppuccin Mocha"
Set TypingSpeed 28ms

Hide
Type "cd ~/dspec-demo/shop && clear" Enter
Type "../.rec-env.sh claude" Enter
Sleep 10s
Down
Sleep 1500ms
Enter
Sleep 14s
Show

Sleep 800ms
Type "when does checkout refuse a second discount code?"
Sleep 900ms
Enter
Sleep 62s
