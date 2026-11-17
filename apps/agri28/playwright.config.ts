import { defineConfig, devices } from '@playwright/test';

/**
 * Les tests de bout en bout tournent sur le BUILD de production servi par
 * `vite preview`, avec le chemin de base réel de GitHub Pages (/WinBest/).
 * C'est ce qui permet de vérifier que la base et le service worker sont corrects.
 */
const BASE_PATH = '/WinBest/';
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
    command: 'npm run build && npm run preview',
    url: `http://127.0.0.1:${PORT}${BASE_PATH}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
