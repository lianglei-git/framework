import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const loginWebSrc = path.resolve(__dirname, '../../../Packages/Login/web/src')

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@zayne/login': loginWebSrc,
    },
  },
  optimizeDeps: {
    include: ['mobx', 'mobx-react-lite', 'axios'],
  },
})
