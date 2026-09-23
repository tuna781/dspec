#!/usr/bin/env bash
# Grade every answer in a results directory against its task's rubric. The grader is shown the
# request, the rubric and the answer — never which condition produced it.
#
#   ./judge.sh results/<timestamp>
set -euo pipefail
cd "$(dirname "$0")"
DIR="$1"
for f in "$DIR"/*.json; do
  case "$f" in *.grade.json) continue ;; esac
  g="${f%.json}.grade.json"
  [ -s "$g" ] && continue
  task="$(basename "$f" | cut -d. -f1)"
  answer="$(node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(r.result||"")' "$f" 2>/dev/null || true)"
  ask="You are grading an AI coding agent's answer against a rubric. Grade only what the answer says, strictly by the rubric.

<request>
$(cat "tasks/$task.prompt")
</request>

<rubric>
$(cat "tasks/$task.rubric")
</rubric>

<answer>
$answer
</answer>

Reply with one line of JSON and nothing else: {\"score\": <integer>, \"why\": \"<one sentence>\"}"
  claude -p "$ask" --model sonnet --output-format json --tools "" > "$g" || echo "  ✗ grading failed: $f" >&2
done
