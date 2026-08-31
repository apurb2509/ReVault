import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Removed external: ['react-is'] because it causes browser ESM crash
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ['react-is'],
  },
})
