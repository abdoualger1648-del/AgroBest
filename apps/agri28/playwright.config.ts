import { defineConfig, devices } from '@playwright/test';

/**
 * Les tests de bout en bout tournent sur le BUILD de production servi par
 * `vite preview`, avec le chemin de base réel de GitHub Pages (/AgroBest/).
 * C'est ce qui permet de vérifier que la base et le service worker sont corrects.
 */
const BASE_PATH = '/AgroBest/';
const PORT = 4173;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  timeout: 30_000,
  use: {
    baseURL: `http://127.0.0.1:${PORT}${BASE_PATH}`,
    trace: 'off',
    locale: 'fr-FR',
  },
  projects: [
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    // En CI, le build vient d'être fait par l'étape précédente du workflow :
    // le refaire ici doublait le travail et ajoutait un maillon (l'enchaînement
    // `&&` dans un shell) dont l'échec était invisible. En local, on construit,
    // parce qu'aucune étape ne l'a fait avant.
    command: process.env.CI ? 'npm run preview' : 'npm run build && npm run preview',
    url: `http://127.0.0.1:${PORT}${BASE_PATH}`,
    reuseExistingServer: !process.env.CI,
    // Playwright ignore la sortie standard du serveur par défaut : quand il
    // expire, on ne voit ni le démarrage, ni l'erreur qui l'a empêché. On la
    // laisse passer — c'est elle qui a montré que le serveur démarrait bien,
    // mais sur « localhost », que le runner résout en IPv6 alors qu'on
    // interroge 127.0.0.1. D'où le `--host 127.0.0.1` du script `preview`.
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 300_000,
  },
});
