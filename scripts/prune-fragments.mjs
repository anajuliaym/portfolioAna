// After `vite build --mode fragments`: delete every file in dist-fragments that the page never
// references (Vite copies the whole public/ folder and emits assets of modules that were later
// tree-shaken — the desk models, badge textures, postcards…). Keeps the stand-alone build to
// Fragments only, as promised.
import { readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { join, relative, basename } from 'node:path'

const out = 'dist-fragments'
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p] })
const files = walk(out)
const text = files.filter((f) => /\.(html|js|css)$/.test(f)).map((f) => readFileSync(f, 'utf8')).join('\n')
let removed = 0, kept = 0
for (const f of files) {
  if (/\.(html|js|css)$/.test(f)) { kept++; continue }
  if (text.includes(basename(f))) { kept++; continue }
  rmSync(f); removed++
}
// drop directories left empty
for (const d of ['models', 'textures', 'assets']) { try { if (readdirSync(join(out, d)).length === 0) rmSync(join(out, d), { recursive: true }) } catch {} }
console.log(`prune-fragments: kept ${kept}, removed ${removed} unreferenced files from ${relative('.', out)}`)
