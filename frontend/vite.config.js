import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/shopee': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/posts': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/generate': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/crawl': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/facebook': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/github': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/shorten': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/shortlinks': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/r': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
