import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/CeNtro-Partner/' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['assets/CeNtro Partner.png', 'data/Base_CeNtro Partner.xlsx'],
      manifest: {
        name: 'CeNtro Partner', short_name: 'CeNtro Partner',
        description: 'Ranking regional Ops + RH · Región Centro Norte',
        theme_color: '#006241', background_color: '#ffffff', display: 'standalone',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg,webmanifest,xlsx}'] }
    })
  ]
}))
