#!/bin/sh
# Privacy gate (scripts/privacy-check.mjs): Node, or Docker's node image when Node isn't installed.
#   scripts/privacy-check.sh [--notes notes.md] [files …]
# The private deny-list comes from HOMEVIEW_DENYLIST (text) and/or HOMEVIEW_DENYLIST_FILE — never
# from this repository. Run it before every commit and tag; CI runs it too.
set -e
cd "$(dirname "$0")/.."
if command -v node >/dev/null 2>&1; then
  exec node scripts/privacy-check.mjs "$@"
fi
# Docker: the tracked files listed here (the image has no git); a deny-list file mounted read-only
[ $# -gt 0 ] || set -- $(git ls-files --cached --others --exclude-standard)
if [ -n "${HOMEVIEW_DENYLIST_FILE:-}" ]; then
  exec docker run --rm -e HOMEVIEW_DENYLIST -e HOMEVIEW_DENYLIST_FILE=/deny.txt -v "$HOMEVIEW_DENYLIST_FILE:/deny.txt:ro" \
    -v "$PWD:/src:ro" -w /src node:20-alpine node scripts/privacy-check.mjs "$@"
fi
exec docker run --rm -e HOMEVIEW_DENYLIST -v "$PWD:/src:ro" -w /src node:20-alpine node scripts/privacy-check.mjs "$@"
