import path from 'path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  envDir: path.resolve(__dirname, '..'),
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Pin only framework-level deps that are *always* on the eager path
        // and large enough to be worth caching independently. Smaller libs
        // and route-specific deps stay grouped with their consumer chunks
        // via Vite's default per-importer splitting — explicit splits there
        // get eagerly preloaded for any consumer, which hurts cold loads.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.match(/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/))
            return 'vendor-react'
          if (id.includes('@auth0')) return 'vendor-auth'
          return undefined
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    passWithNoTests: true,
  },
})
