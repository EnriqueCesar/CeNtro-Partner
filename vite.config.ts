import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const BASE = '/CeNtro-Partner/'

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: [
        'assets/CeNtro Partner.png',
        'data/Base_CeNtro Partner.xlsx',
        'icons/icon-192.png',
        'icons/icon-512.png'
      ],
      manifest: {
        id: BASE,
        name: 'CeNtro Partner',
        short_name: 'CeNtro Partner',
        description: 'Ranking regional Ops + RH · Región Centro Norte',
        start_url: BASE,
        scope: BASE,
        theme_color: '#006241',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: `${BASE}icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${BASE}icons/icon-512.png`, sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest,xlsx}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.xlsx'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'centro-partner-excel-v2',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 3, maxAgeSeconds: 86400 }
            }
          }
        ]
      }
    })
  ],
  build: { sourcemap: false, target: 'es2020' }
})
