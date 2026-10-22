#!/usr/bin/env bash
# Rebuilds the live Bridge demo that runs inside the 3D phone on /projetos (public/protos/bridge/).
# Usage: scripts/bridge-demo/build.sh [path or git URL of bridge-your-career]   (default: Ana's GitHub repo)
# Works on a copy: the app's repo is never touched. The app is TanStack Start (SSR on Cloudflare); here it becomes a
# plain SPA (main.tsx + vite.demo.config.ts, base /protos/bridge/) whose /api calls are answered in the browser by the
# app's own in-memory handler (demo-api.ts) — no Worker, no D1.
set -euo pipefail
SRC="${1:-https://github.com/anajuliaym/bridge-your-career.git}"
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$HERE/../.." && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
if [[ -d "$SRC" ]]; then rsync -a --exclude node_modules --exclude dist --exclude .git "$SRC/" "$TMP/"; else git clone -q --depth 1 "$SRC" "$TMP"; fi
cd "$TMP"
cp "$HERE/demo-api.ts" src/demo-api.ts
cp "$HERE/main.tsx" src/demo-main.tsx
cp "$HERE/vite.demo.config.ts" vite.demo.config.ts
node -e '
const fs = require("fs");
// the router under the demo base path
let r = fs.readFileSync("src/router.tsx", "utf8");
r = r.replace("routeTree,", "routeTree,\n    basepath: import.meta.env.BASE_URL.replace(/\\/$/, \"\") || \"/\",");
fs.writeFileSync("src/router.tsx", r);
// no <html> shell outside Start: the root renders into #root
let root = fs.readFileSync("src/routes/__root.tsx", "utf8");
if (!root.includes("shellComponent: RootShell,")) throw new Error("__root.tsx changed: update build.sh");
root = root.replace("shellComponent: RootShell,", "");
fs.writeFileSync("src/routes/__root.tsx", root);
fs.writeFileSync("index.html", `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#1a1726" />
    <title>Bridge</title>
    <link rel="icon" href="/protos/bridge/logo.png" />
    <!-- Start rendered the app straight into <body>; here #root sits in between, so it has to carry the height -->
    <style>html, body, #root { height: 100%; margin: 0; }</style>
    <!-- under 640px the app frame (PhoneShell) only has min-h-dvh, so the card deck (h-full) collapses to 0;
         from sm up it is a fixed 860px. Give phones the screen height, the way sm gets its fixed frame. -->
    <style>@media (max-width: 639px) { .min-h-dvh { height: 100dvh; } }</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/demo-main.tsx"></script>
  </body>
</html>
`);
'
npm ci --no-audit --no-fund >/dev/null 2>&1
npx vite build --config vite.demo.config.ts
rm -rf "$ROOT/public/protos/bridge" && mkdir -p "$ROOT/public/protos" && cp -R dist-demo "$ROOT/public/protos/bridge"
echo "→ public/protos/bridge ($(du -sh "$ROOT/public/protos/bridge" | cut -f1))"
