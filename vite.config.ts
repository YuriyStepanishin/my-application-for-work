import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8')) as {
  version: string;
};

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  server: {
    proxy: {
      '/api/sales': {
        target:
          'https://script.google.com/macros/s/AKfycbwVr7l4-MYv8lZyuSC2WF9_DMS6p79LVKq9f1rhcgmn1TiuTf72RG-6IQG_ZDvhgsq3',
        changeOrigin: true,
        secure: true,
        rewrite: () => '/exec',
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'SODA',
        short_name: 'SODA',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        background_color: '#ffffff',
        theme_color: '#ffffff',
        orientation: 'portrait',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-192-maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
});
