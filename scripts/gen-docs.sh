#!/bin/sh
# Writes README.md's option tables, custom_pages/README.md's key tables and examples/full.yaml from
# schema/options.json (scripts/gen-docs.mjs): Node, or Docker's node image when Node isn't installed.
#   scripts/gen-docs.sh [--check | --stamp X.Y.Z | --todo]
set -e
cd "$(dirname "$0")/.."
if command -v node >/dev/null 2>&1; then
  exec node scripts/gen-docs.mjs "$@"
fi
exec docker run --rm --user "$(id -u):$(id -g)" -v "$PWD:/src" -w /src node:20-alpine node scripts/gen-docs.mjs "$@"
