#!/usr/bin/env bash
# Put each task to real Claude Code sessions in demo/shop, with and without its .ds/ map, then have
# a separate session grade every answer blind against the task's rubric.
#
#   ./run.sh [runs-per-cell]      default 3; writes results/<timestamp>/ and prints the report
#
# Like the recording, every session runs in a throwaway copy OUTSIDE this repository: Claude Code
# reads CLAUDE.md from every parent directory, so a session inside demo/shop would inherit dspec's
# own block and the "without" condition would stop being a baseline.
#
# Costs 2 x tasks x runs sessions, plus one grading session per answer, on your own account.
set -euo pipefail
cd "$(dirname "$0")"
HERE="$PWD"
SHOP="$HERE/../shop"
RUNS="${1:-3}"
OUT="$HERE/results/$(date +%Y%m%d-%H%M%S)"
STAGE="$(mktemp -d "${TMPDIR:-/tmp}/dspec-eval.XXXXXX")"
trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$OUT"

# The recording's environment scrub: an outer session's variables must not leak into these.
for v in $(env | grep -oE '^(CLAUDE_CODE|VSCODE)_[A-Z_]*' || true); do unset "$v"; done
unset CLAUDECODE || true

# Read-only tools, so a session that decides to act anyway cannot change the fixture under it.
TOOLS=(Read Grep Glob "Bash(ls:*)" "Bash(cat:*)" "Bash(grep:*)" "Bash(find:*)")

stage() { # $1 = with|without → prints the directory to run in
  local dir="$STAGE/$1-$RANDOM$RANDOM/shop"
  mkdir -p "$dir"
  cp -R "$SHOP/src" "$dir/src"
  if [ "$1" = with ]; then cp -R "$SHOP/.ds" "$dir/.ds"; cp "$SHOP/CLAUDE.md" "$dir/CLAUDE.md"; fi
  echo "$dir"
}

for prompt in tasks/*.prompt; do
  task="$(basename "$prompt" .prompt)"
  for i in $(seq 1 "$RUNS"); do
    for cond in without with; do
      dir="$(stage "$cond")"
      echo "· $task  $cond  #$i" >&2
      (cd "$dir" && claude -p "$(cat "$HERE/$prompt")" --output-format json \
        --allowedTools "${TOOLS[@]}" --disallowedTools Edit Write NotebookEdit) \
        > "$OUT/$task.$cond.$i.json" || echo "  ✗ session failed" >&2
    done
  done
done

"$HERE/judge.sh" "$OUT"
node "$HERE/report.js" "$OUT" | tee "$OUT/report.md"
