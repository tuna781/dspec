#!/usr/bin/env bash
# Join the two recorded halves into ../demo-split.gif, with a label strip above each.
# Nothing inside either pane is retimed or edited — they are the two recordings as made,
# played from their own first frame, side by side.
set -euo pipefail
cd "$(dirname "$0")"
python3 make-labels.py
ffmpeg -v error -y \
  -i half-without.gif -i half-with.gif -loop 1 -i label-without.png -loop 1 -i label-with.png \
  -filter_complex "\
[2:v]trim=duration=48,setpts=PTS-STARTPTS[lw];\
[3:v]trim=duration=48,setpts=PTS-STARTPTS[lt];\
[0:v]trim=duration=48,fps=8,setpts=PTS-STARTPTS[a];\
[1:v]trim=duration=48,fps=8,setpts=PTS-STARTPTS[b];\
[lw][a]vstack=inputs=2[L];\
[lt][b]vstack=inputs=2[R];\
[L]pad=iw+6:ih:0:0:color=0x313244[Lp];\
[Lp][R]hstack=inputs=2,scale=1500:-2:flags=lanczos,split[s0][s1];\
[s0]palettegen=max_colors=64:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3" \
  ../demo-split.gif
ls -lh ../demo-split.gif
