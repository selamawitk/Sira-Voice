import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png', 'manifest.json'],
      manifest: {
        name: 'Sira-Voice',
        short_name: 'SiraVoice',
        description: "Voice-driven AI job agent for Ethiopia's informal workforce",
        start_url: '/',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone'],
        orientation: 'portrait-primary',
        background_color: '#1A2E35',
        theme_color: '#2BB8B8',
        categories: ['productivity', 'social', 'utilities'],
        lang: 'en',
        scope: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/jobs/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'jobs-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24,
              },
            },
          },
          {
            urlPattern: /^https?:\/\/.*\/api\/ai/,
            handler: 'NetworkOnly',
            options: {
              cacheName: 'ai-cache',
            },
          },
        ],
      },
    }),
  ],
})