#!/bin/sh
# Syntax-check dist/homeview.js with Node (or Docker's node image when Node isn't installed).
set -e
cd "$(dirname "$0")/.."
if command -v node >/dev/null 2>&1; then
  node --check dist/homeview.js
else
  docker run --rm -v "$PWD/dist:/src:ro" node:20-alpine node --check /src/homeview.js
fi
echo "dist/homeview.js: syntax OK"
