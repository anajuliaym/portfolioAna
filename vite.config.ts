import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import vercel from './vercel.json'

/**
 * `vite preview` serves the build with the same security headers as Vercel (CSP etc., from vercel.json), so a CSP that
 * breaks something shows up locally before it ships. Not in dev: Vite's HMR injects inline scripts and styles.
 * The `source` patterns in vercel.json are written so they also read as plain regexes.
 */
function vercelHeaders(): Plugin {
  const rules = (vercel.headers ?? []).map((r) => ({ re: new RegExp(`^${r.source}$`), headers: r.headers }))
  return {
    name: 'vercel-headers',
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? '/').split('?')[0]
        for (const r of rules) if (r.re.test(path)) for (const h of r.headers) res.setHeader(h.key, h.value)
        next()
      })
    },
  }
}

/** the Fragments-only build (QR code) must not preview the portfolio: drop the link-preview tags from its index.html */
function dropPreviewInFragments(mode: string): Plugin {
  return { name: 'drop-og-in-fragments', transformIndexHtml: (html) => (mode === 'fragments' ? html.replace(/<!-- og:start[\s\S]*?og:end -->\n?/, '') : html) }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), vercelHeaders(), dropPreviewInFragments(mode)],
  // 5173/5174 são usadas por outros projetos nesta máquina.
  // host '::' escuta IPv4 e IPv6 ao mesmo tempo — só em ::1 o navegador
  // pode cair em "conexão recusada" ao resolver localhost para 127.0.0.1.
  server: { port: 5175, strictPort: true, host: '::' },
  preview: { port: 5177, strictPort: true, host: '::' },
  build: {
    rollupOptions: {
      output: {
        // libraries in their own long-lived chunks: a content update re-downloads only the site's code, not three.js
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/node_modules\/three\//.test(id)) return 'three'
          if (/@react-three\/(fiber|drei)|three-stdlib|troika|maath|zustand|its-fine|suspend-react/.test(id)) return 'r3f'
          if (/postprocessing|n8ao/.test(id)) return 'postfx'
          if (/framer-motion|motion-dom|motion-utils/.test(id)) return 'motion'
          if (/react-dom|react-router|\/react\/|scheduler/.test(id)) return 'react'
        },
      },
    },
  },
}))
