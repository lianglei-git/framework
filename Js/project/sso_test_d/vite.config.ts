import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

const loginWebSrc = path.resolve(__dirname, '../../../Packages/Login/web/src')

export default defineConfig({
  plugins: [react()],
  server: { port: 5176, strictPort: true },
  resolve: {
    alias: { '@sparrow/login': loginWebSrc },
  },
  optimizeDeps: { include: ['mobx', 'mobx-react-lite', 'axios'] },
})
