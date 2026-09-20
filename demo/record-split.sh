#!/usr/bin/env bash
# Record the split demo: two real Claude Code sessions asked the same question,
# one in a repo carrying a .ds/ map and one without, joined side by side.
#
#   ./record-split.sh            both halves, then composite with ./compose-split.sh
#   ./record-split.sh with       one half only
#
# The session MUST run outside this repository. Claude Code reads CLAUDE.md from every
# parent directory, so a session in demo/shop inherits dspec's own block from the repo
# root and the "without" half stops being a no-dspec baseline. So each half is recorded
# in a throwaway copy under ~/dspec-demo, which is removed afterwards.
set -euo pipefail
cd "$(dirname "$0")"
SRC="$PWD/shop"
STAGE="$HOME/dspec-demo"

stage() { # $1 = with|without
  rm -rf "$STAGE"; mkdir -p "$STAGE/shop"
  cp -R "$SRC/src" "$STAGE/shop/src"
  if [ "$1" = "with" ]; then
    cp -R "$SRC/.ds" "$STAGE/shop/.ds"
    cp "$SRC/CLAUDE.md" "$STAGE/shop/CLAUDE.md"
  fi
  cp "$PWD/.rec-env.sh" "$STAGE/.rec-env.sh"
}
cleanup() { rm -rf "$STAGE"; }
trap cleanup EXIT

one() { stage "$1"; vhs "half-$1.tape"; }

case "${1:-all}" in
  without|with) one "$1" ;;
  all)          one without; one with ;;
  *) echo "usage: $0 [without|with|all]" >&2; exit 2 ;;
esac
