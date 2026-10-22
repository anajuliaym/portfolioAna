#!/usr/bin/env bash
# Builds the clickable Orçamentária prototype for the 3D MacBook on /projetos (public/protos/orcamentaria/).
# Usage: scripts/orcamentaria-demo/build.sh "/path/to/orcamentaria.pdf"
# Ana's design exists as screens only (an 8-page PDF): each page becomes a screen; index.html lays hotspots over the
# menu, the tabs and the buttons, so it navigates like the real thing.
set -euo pipefail
PDF="${1:?path to orcamentaria.pdf}"
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$HERE/../.." && pwd)"
OUT="$ROOT/public/protos/orcamentaria"
rm -rf "$OUT" && mkdir -p "$OUT/screens"
swift "$HERE/render.swift" "$PDF" "$OUT/screens" 1650
cp "$HERE/index.html" "$OUT/index.html"
echo "→ public/protos/orcamentaria ($(du -sh "$OUT" | cut -f1))"
