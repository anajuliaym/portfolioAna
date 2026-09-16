import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // 5173/5174 são usadas por outros projetos nesta máquina.
  // host '::' escuta IPv4 e IPv6 ao mesmo tempo — só em ::1 o navegador
  // pode cair em "conexão recusada" ao resolver localhost para 127.0.0.1.
  server: { port: 5175, strictPort: true, host: '::' },
})
