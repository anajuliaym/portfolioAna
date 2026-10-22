#!/usr/bin/env bash
# Rebuilds the live Bora? demo that runs inside the 3D phone on /projetos (public/protos/bora/).
# Usage: scripts/bora-demo/build.sh "/path/to/Bora?/frontend-react"
# Builds a copy (the source folder is never touched) in prototype mode — no Supabase, sample data, offline map —
# with base /protos/bora/ (vite.demo.config.js rewrites the app's absolute '/assets/...' paths).
set -euo pipefail
SRC="${1:?path to Bora?/frontend-react}"
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$HERE/../.." && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
rsync -a --exclude node_modules --exclude dist --exclude dist-demo --exclude .env.local "$SRC/" "$TMP/"
cp "$HERE/vite.demo.config.js" "$TMP/"
cd "$TMP" && npm install --no-audit --no-fund >/dev/null
# empty Supabase vars beat any .env file: the demo never talks to a real backend
VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npx vite build --config vite.demo.config.js
rm -rf "$ROOT/public/protos/bora" && mkdir -p "$ROOT/public/protos" && cp -R dist-demo "$ROOT/public/protos/bora"
echo "→ public/protos/bora ($(du -sh "$ROOT/public/protos/bora" | cut -f1))"
