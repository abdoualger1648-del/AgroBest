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
        // Les bibliothèques d'export pèsent plus de 2 Mo à elles seules :
        // les pré-cacher imposerait ce téléchargement à la première visite,
        // y compris à qui n'exportera jamais. Elles sont mises en cache au
        // premier usage, et restent ensuite disponibles hors ligne.
        // Et l'on ne pré-cache que la semaine 1 des leçons : les 21 autres
        // journées sont mises en cache à la première ouverture, comme prévu
        // au cadrage. Un utilisateur sur connexion faible télécharge donc la
        // coque et sa première semaine, pas les 56 fichiers de contenu.
        globIgnores: [
          '**/export-*.js',
          '**/firebase-*.js',
          '**/day-0[89]*.js',
          '**/day-1[0-9]*.js',
          '**/day-2[0-8]*.js',
        ],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/day-\d{2}\.[a-z]{2}-[^/]+\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'lessons',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /\/assets\/export-[^/]+\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'export-libs',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 180 },
            },
          },
          {
            // Le SDK Firebase ne sert qu'au compte : il arrive à la première
            // action réseau, et jamais à l'installation (même raison que D32).
            urlPattern: /\/assets\/firebase-[^/]+\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'firebase-sdk',
              expiration: { maxEntries: 6, maxAgeSeconds: 60 * 60 * 24 * 180 },
            },
          },
        ],
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
    rollupOptions: {
      output: {
        // Noms stables pour les bibliothèques d'export, afin de les exclure
        // du pré-cache du service worker.
        manualChunks: (id: string) => {
          if (id.includes('node_modules/docx')) return 'export-docx';
          if (id.includes('node_modules/exceljs')) return 'export-xlsx';
          if (id.includes('node_modules/pdf-lib')) return 'export-pdf';
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase'))
            return 'firebase-sdk';
          return undefined;
        },
      },
    },
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
