/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

/** Korte commit-hash van deze build: Vercel geeft hem mee, lokaal vragen we het git. */
function commitHash(): string {
  const fromVercel = process.env.VERCEL_GIT_COMMIT_SHA
  if (fromVercel) return fromVercel.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return 'lokaal'
  }
}

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string
}

// https://vite.dev/config/
export default defineConfig({
  // Zichtbaar onderaan Instellingen, zodat je ziet welke versie je draait.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_COMMIT__: JSON.stringify(commitHash()),
  },
  plugins: [
    vue(),
    tailwindcss(),
    // Installeerbaar op het beginscherm; de app-schil laadt ook zonder verbinding.
    // Data (Supabase) heeft wel verbinding nodig; een lopende sessie staat lokaal.
    VitePWA({
      registerType: 'autoUpdate',
      // De registratie staat in src/main.ts, zodat de app bij een update zelf opnieuw laadt.
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Reforged — workout tracker',
        short_name: 'Reforged',
        description: 'Tik je sets af. De rest rekent de app uit.',
        lang: 'nl',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0e0f13',
        theme_color: '#0e0f13',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Een nieuwe versie neemt meteen het werk over; main.ts laadt de pagina dan opnieuw.
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Auth-redirects en API-verkeer nooit uit de cache beantwoorden.
        navigateFallbackDenylist: [/^\/auth\//],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
