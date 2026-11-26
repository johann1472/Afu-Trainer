import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')),
  },
  base: process.env.BASE_PATH ?? '/Afu-Trainer/',
  plugins: [
    preact(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Afu-Trainer',
        short_name: 'Afu-Trainer',
        description: 'Lernen für die Amateurfunkprüfung (Klassen N, E, A)',
        lang: 'de',
        theme_color: '#173f7a',
        background_color: '#101418',
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'any',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Katalogbilder (687 Dateien) nicht im Precache: ein einzelner Netzfehler würde sonst die
        // ganze Installation scheitern lassen. Sie werden zur Laufzeit gecacht und von
        // src/offline.ts im Hintergrund vorgeladen.
        globPatterns: ['**/*.{js,css,html,json,png,webp,woff2}', 'formulas/*.svg'],
        globIgnores: ['svgs/**'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/svgs/'),
            handler: 'CacheFirst',
            options: { cacheName: 'katalog-bilder', cacheableResponse: { statuses: [200] } },
          },
        ],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
    }),
  ],
});
