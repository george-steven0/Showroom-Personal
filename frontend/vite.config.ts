import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // A fixed, slightly unusual port — 5173 is Vite's shared default and
    // collides with other local projects' dev servers on this machine.
    port: 5190,
    strictPort: true,
    open: false,
    // API_BASE ('/api') is relative — without this proxy, a fetch from the
    // dev server resolves against :5173 itself instead of the backend on
    // :3000. Production has no proxy: the backend serves the built
    // frontend from the same origin.
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/health': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
})
