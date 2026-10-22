#!/usr/bin/env bash
# Rebuilds the live "Comparar arquivos CSV" demo that runs on the 3D MacBook on /projetos (public/protos/csv/).
# Usage: scripts/csv-demo/build.sh "/path/to/Comparar arquivos CSV"
# Works on a copy (the source is never touched): base /protos/csv/, entry = demo-main.tsx (the app + a "use sample
# files" pill with fictional CSVs). The app itself is fully client-side (Papa Parse), so nothing else is needed.
set -euo pipefail
SRC="${1:?path to the Comparar arquivos CSV folder}"
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$HERE/../.." && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
rsync -a --exclude node_modules --exclude dist "$SRC/" "$TMP/"
cd "$TMP"
mkdir -p src/demo && cp "$HERE/afiliados.csv" "$HERE/vendas.csv" src/demo/
cp "$HERE/demo-main.tsx" src/demo-main.tsx
sed -i '' 's#/src/main.tsx#/src/demo-main.tsx#' index.html
rm -f pnpm-workspace.yaml # a Figma Make export: install with npm, not as a pnpm workspace
npm install --no-audit --no-fund >/dev/null 2>&1
npx vite build --base /protos/csv/ --outDir dist-demo --emptyOutDir
rm -rf "$ROOT/public/protos/csv" && mkdir -p "$ROOT/public/protos" && cp -R dist-demo "$ROOT/public/protos/csv"
echo "→ public/protos/csv ($(du -sh "$ROOT/public/protos/csv" | cut -f1))"
