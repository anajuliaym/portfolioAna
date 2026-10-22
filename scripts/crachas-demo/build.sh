#!/usr/bin/env bash
# Builds the clickable, ANONYMIZED badge-management prototype for the 3D MacBook (public/protos/crachas/).
# Usage: scripts/crachas-demo/build.sh "/path/to/Gerenciamento de crachás.pdf"
# Pages → screens at 1650 px (the Orçamentária renderer), then anonymize.py swaps the client's logo and e-mail for a
# fictional mark (Ana chose to anonymize: the portfolio is public). index.html lays hotspots over the screens.
set -euo pipefail
PDF="${1:?path to Gerenciamento de crachás.pdf}"
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$HERE/../.." && pwd)"
OUT="$ROOT/public/protos/crachas"
rm -rf "$OUT" && mkdir -p "$OUT/screens"
swift "$ROOT/scripts/orcamentaria-demo/render.swift" "$PDF" "$OUT/screens" 1650
python3 "$HERE/anonymize.py" "$OUT/screens"
cp "$HERE/index.html" "$OUT/index.html"
echo "→ public/protos/crachas ($(du -sh "$OUT" | cut -f1))"
