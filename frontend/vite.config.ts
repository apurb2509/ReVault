import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Recharts needs react-is at runtime; rolldown treats it as missing unless declared
    rolldownOptions: {
      external: ['react-is'],
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ['react-is'],
  },
})
