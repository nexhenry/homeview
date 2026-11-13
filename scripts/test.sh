#!/bin/sh
# HomeView's headless tests (test/*.test.mjs, node:test, no dependencies): Node, or Docker's node image
# when Node isn't installed.
set -e
cd "$(dirname "$0")/.."
if command -v node >/dev/null 2>&1; then
  node --test test/*.test.mjs
else
  docker run --rm -v "$PWD:/src:ro" -w /src node:20-alpine node --test test/*.test.mjs
fi
