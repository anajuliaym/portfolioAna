import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // 5173/5174 são usadas por outros projetos nesta máquina.
  // host '::' escuta IPv4 e IPv6 ao mesmo tempo — só em ::1 o navegador
  // pode cair em "conexão recusada" ao resolver localhost para 127.0.0.1.
  server: { port: 5175, strictPort: true, host: '::' },
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
})
