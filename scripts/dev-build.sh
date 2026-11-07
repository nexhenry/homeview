#!/usr/bin/env bash
# A development copy of HomeView that can run next to the released one (e.g. the HACS install):
# its own element names and strategy type, custom:homeview-dev. Point a test dashboard at the live
# one's settings with
#   strategy: { type: custom:homeview-dev, from: <the live dashboard's url> }
# and add the copy as a dashboard resource (module), e.g. /local/homeview-dev/homeview.js.
#   scripts/dev-build.sh <output file>      (default: dist/homeview-dev.js)
set -euo pipefail
cd "$(dirname "$0")/.."
out="${1:-dist/homeview-dev.js}"
mkdir -p "$(dirname "$out")"
sed -e 's/ll-strategy-dashboard-homeview\b/ll-strategy-dashboard-homeview-dev/g' \
    -e 's/homeview-page/homeview-dev-page/g' \
    -e 's/homeview-tile/homeview-dev-tile/g' \
    -e 's/homeview-strategy-editor/homeview-dev-strategy-editor/g' \
    -e "s/^const HV_VERSION = '\([0-9.]*\)';/const HV_VERSION = '\1-dev';/" \
    -e "s/'custom:homeview'/'custom:homeview-dev'/g" \
    dist/homeview.js > "$out"
# the two copies must not share a single custom element name
if grep -oE "customElements\.define\('[a-z-]+'" "$out" | grep -vq -- '-dev'; then
  echo "dev-build: an element name wasn't renamed:" >&2
  grep -oE "customElements\.define\('[a-z-]+'" "$out" | grep -v -- '-dev' >&2
  exit 1
fi
# syntax check as an ES module (how browsers load it): Node, or Docker's node image
if command -v node >/dev/null 2>&1; then node --input-type=module --check < "$out"
else docker run --rm -i node:20-alpine node --input-type=module --check < "$out"; fi
echo "dev-build: $out ($(grep -m1 -o "HV_VERSION = '[^']*'" "$out"))"
