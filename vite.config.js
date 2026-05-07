import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
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
