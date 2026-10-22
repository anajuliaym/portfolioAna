import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Demo build of Bora? for Ana's portfolio (run through scripts/bora-demo/build.sh): served from /protos/bora/ inside the 3D phone.
// The app's code points at absolute '/assets/...'; rewrite those to the demo's base at build time.
const BASE = '/protos/bora/'
const rebase = {
  name: 'rebase-assets',
  enforce: 'pre',
  transform(code, id) {
    if (!/\.(jsx?|css)$/.test(id.split('?')[0]) || id.includes('node_modules')) return null
    return code.replace(/(['"`(])\/assets\//g, `$1${BASE}assets/`)
  },
}
export default defineConfig({
  base: BASE,
  plugins: [rebase, react()],
  build: { outDir: 'dist-demo', emptyOutDir: true },
})
