import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Three.js + R3F is large and only needed for the aurora background.
          // Keep it in its own chunk so the main bundle stays lean and it can
          // be loaded lazily / cached independently.
          three: ['three', '@react-three/fiber'],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.js',
      registerType: 'autoUpdate',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      manifest: {
        name: 'Gentle BadAss Movement Framework',
        short_name: 'Gentle BadAss',
        description: 'Movement & Mindfulness by Dr. Rajat Chauhan',
        theme_color: '#f5f0e8',
        background_color: '#f5f0e8',
        display: 'standalone',
        icons: [
          {
            src: '/la-ultra-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
})
