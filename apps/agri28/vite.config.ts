import { fileURLToPath, URL } from 'node:url';
import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * GitHub Pages sert le site sous /WinBest/ (nom du dépôt).
 * VITE_BASE permet de surcharger pour un autre hébergement (Netlify, Vercel, local).
 * Décision D2 — voir CLAUDE.md.
 */
const BASE = process.env.VITE_BASE ?? '/WinBest/';

/**
 * GitHub Pages ne connaît pas le routage côté client : un lien profond rechargé
 * renvoie 404. La copie de index.html en 404.html rend le lien fonctionnel.
 */
function githubPagesSpaFallback(): Plugin {
  return {
    name: 'github-pages-spa-fallback',
    apply: 'build',
    closeBundle() {
      const outDir = resolve(import.meta.dirname, 'dist');
      const index = resolve(outDir, 'index.html');
      if (existsSync(index)) copyFileSync(index, resolve(outDir, '404.html'));
    },
  };
}

// Le mode (et non la commande) décide du chemin de base : `vite preview`
// sert le build de production et doit donc utiliser le même base que lui.
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? BASE : '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Sous Vitest, le module virtuel du plugin PWA n'existe pas : on le remplace.
      ...(process.env.VITEST
        ? {
            'virtual:pwa-register/react': fileURLToPath(
              new URL('./src/pwa/registerStub.ts', import.meta.url),
            ),
          }
        : {}),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon-180.png'],
      manifest: {
        name: 'Agricole DZ 360 — 28 jours avec l’IA',
        short_name: 'Agricole DZ',
        description:
          'Parcours de 15 minutes par jour pendant 28 jours pour organiser, planifier et piloter son projet agricole avec l’IA.',
        // Un manifeste est statique : il ne peut pas porter deux langues.
        // Le nom affiché à l'installation reste donc en français ; une version
        // localisée du manifeste sera étudiée en phase 7.
        lang: 'fr',
        dir: 'ltr',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#faf8f4',
        theme_color: '#2f6b46',
        categories: ['education', 'productivity', 'business'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: false,
      },
      devOptions: { enabled: false },
    }),
    githubPagesSpaFallback(),
  ],
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.{test,spec}.{ts,tsx}', 'src/test/**', 'src/main.tsx'],
    },
  },
}));
