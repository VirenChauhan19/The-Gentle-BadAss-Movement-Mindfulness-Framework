import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/The-Gentle-BadAss-Movement-Mindfulness-Framework/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Gentle BadAss Movement Framework',
        short_name: 'Gentle BadAss',
        description: 'Movement & Mindfulness by Dr. Rajat Chauhan',
        theme_color: '#f5f0e8',
        background_color: '#f5f0e8',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
})
