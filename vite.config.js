import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// В dev-режиме браузер ходит на свой же origin (/api/...), а Vite проксирует
// запросы на бэкенд — так обходим отсутствие CORS на сервере.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_API_PROXY_TARGET || 'https://atria-api.eaysdev.online'

  return {
    plugins: [react()],
    server: {
      port: 5173,
      open: false,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  }
})
